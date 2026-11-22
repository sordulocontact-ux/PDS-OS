"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { toParisLocalInput } from "@/lib/calls/format";
import type { ActionResult } from "@/lib/calls/constants";
import {
  ownedCall,
  participantsSession,
  readParticipantsForm,
} from "@/lib/calls/participants";
import { saveCallParticipants } from "@/lib/calls/participants-actions";
import { meetingUrlSchema } from "@/lib/calls/plan-call";
import type { ParticipantsForm } from "@/lib/calls/prep/pool";
import { rescheduleCall } from "@/lib/calls/reschedule-actions";
import {
  attachGoogleMeet,
  guestsOf,
  resolveGuests,
  slotOf,
  wantsGoogleMeet,
} from "@/lib/calls/schedule";
import {
  googleMeetConfigured,
  renameMeetEvent,
} from "@/lib/integrations/google-calendar";

/** What « Modifier le call » opens with. */
export type CallEditData = {
  title: string;
  // "YYYY-MM-DDTHH:mm" and "HH:mm", in Paris.
  start: string;
  end: string;
  meetingUrl: string | null;
  googleMeet: boolean;
  people: ParticipantsForm;
};

// A call without an end takes 30 minutes, as the call form.
const DEFAULT_MINUTES = 30;

/** Read when the dialog opens, for whoever arranges the call
 * (can_arrange_call), before anything is recorded. */
export async function loadCallEdit(callId: string): Promise<CallEditData> {
  const s = await participantsSession();
  const found = s && (await ownedCall(s, callId));
  if (!s || !found?.owner) throw new Error("forbidden");
  const { data: call } = await s.supabase
    .from("calls")
    .select("title, occurred_at, ends_at, meeting_url, audio_path")
    .eq("id", callId)
    .single();
  if (!call || call.audio_path) throw new Error("forbidden");
  const start = new Date(call.occurred_at);
  const end = call.ends_at
    ? new Date(call.ends_at)
    : new Date(start.getTime() + DEFAULT_MINUTES * 60_000);
  return {
    title: call.title,
    start: toParisLocalInput(start),
    end: toParisLocalInput(end).slice(11),
    meetingUrl: call.meeting_url,
    googleMeet: googleMeetConfigured(),
    people: await readParticipantsForm(s, found.call),
  };
}

const attendeesSchema = z.array(z.uuid()).max(50);

/**
 * « Modifier le call » (Sacha 21/11/2026: « une modale pour modifier tout
 * l'appel », from its page and the deal's page): its name, who takes part,
 * its slot, its video link, in the call form. Each part is written by the
 * gesture that already owns it (rescheduleCall, saveCallParticipants), so
 * the same rules and Google updates apply; only what changed is written.
 */
export async function updateCall(
  _previous: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const s = await participantsSession();
  if (!s) return { ok: false, error: "unauthorized" };
  const callId = String(form.get("callId") ?? "");
  const found = await ownedCall(s, callId);
  if (!found) return { ok: false, error: "not_found" };
  if (!found.owner) return { ok: false, error: "forbidden" };
  const title = String(form.get("title") ?? "").trim();
  if (!title || title.length > 200)
    return { ok: false, error: "title_required" };
  const slot = slotOf(form);
  if (!slot.ok) return slot;
  const google = wantsGoogleMeet(form);
  const link = google
    ? null
    : meetingUrlSchema.safeParse(String(form.get("meetingUrl") ?? ""));
  if (link && !link.success) return { ok: false, error: "link_invalid" };
  let attendees: string[];
  try {
    const parsed = attendeesSchema.safeParse(
      JSON.parse(String(form.get("attendees") ?? "[]")),
    );
    if (!parsed.success) return { ok: false, error: "invalid_input" };
    attendees = parsed.data;
  } catch {
    return { ok: false, error: "invalid_input" };
  }
  const guestInput = guestsOf(form);
  if (!guestInput) return { ok: false, error: "guest_email_invalid" };

  const { data: current } = await s.supabase
    .from("calls")
    .select("title, occurred_at, ends_at, meeting_url, google_event_id")
    .eq("id", callId)
    .single();
  if (!current) return { ok: false, error: "not_found" };
  let googleFailed = false;

  if (title !== current.title) {
    const { error } = await s.supabase
      .from("calls")
      .update({ title })
      .eq("id", callId);
    if (error) return { ok: false, error: "forbidden" };
    if (current.google_event_id)
      await renameMeetEvent({
        eventId: current.google_event_id,
        title,
      }).catch((e: unknown) => {
        console.error("[calls] google rename failed:", e);
        googleFailed = true;
      });
  }

  const startIso = slot.slot.start.toISOString();
  const endIso = slot.slot.end.toISOString();
  if (
    new Date(current.occurred_at).toISOString() !== startIso ||
    (current.ends_at ? new Date(current.ends_at).toISOString() : null) !==
      endIso
  ) {
    const moved = await rescheduleCall(callId, startIso, endIso);
    if (!moved.ok) return moved;
    googleFailed ||= moved.googleFailed;
  }

  const people = await saveCallParticipants(callId, attendees, guestInput);
  if (!people.ok) return people;
  googleFailed ||= people.googleFailed;

  // The link: a new Meet when asked and the call has no Google event, else
  // the pasted one (empty: none).
  if (google && !current.google_event_id) {
    const guests = await resolveGuests(s.supabase, guestInput);
    const me = s.access.personId;
    const made =
      guests.ok &&
      (await attachGoogleMeet(s.supabase, {
        callId,
        title,
        slot: slot.slot,
        memberIds: me
          ? [me, ...attendees.filter((id) => id !== me)]
          : attendees,
        guests: guests.guests,
      }));
    googleFailed ||= !made;
  } else if (link?.success && link.data !== current.meeting_url) {
    const { error } = await s.supabase
      .from("calls")
      .update({ meeting_url: link.data })
      .eq("id", callId);
    if (error) return { ok: false, error: "forbidden" };
  }

  refresh();
  return { ok: true, id: callId, meetFailed: googleFailed };
}
