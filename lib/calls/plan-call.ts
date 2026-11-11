import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Access } from "@/lib/auth/access";
import type { CallErrorCode } from "@/lib/calls/constants";
import type { AgendaItem } from "@/lib/calls/first-call-agenda";
import { inviteProjectTeam } from "@/lib/calls/invite";
import {
  attachGoogleMeet,
  guestsOf,
  resolveGuests,
  saveGuests,
  slotOf,
  wantsGoogleMeet,
} from "@/lib/calls/schedule";
import { schedulePendingPushes } from "@/lib/notifications/push";
import type { Database } from "@/lib/supabase/database.types";

const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();

// A video link (Meet, Zoom, Teams…): https only, as the database checks.
// Blank means none.
export const meetingUrlSchema = z
  .string()
  .trim()
  .max(500)
  .transform((value) => value || null)
  .refine((value) => value === null || /^https:\/\/\S+$/.test(value));

function meetingUrlOf(form: FormData): string | null | undefined {
  const parsed = meetingUrlSchema.safeParse(text(form, "meetingUrl"));
  return parsed.success ? parsed.data : undefined;
}

type Session = { access: Access; supabase: SupabaseClient<Database> };

/**
 * A new call, planned like a Teams meeting (docs/ARCHITECTURE.md § 4 bis):
 * title, slot, members, guests by e-mail, and a Meet link created by Google
 * Calendar (or a pasted link). Everything is checked before anything is
 * written; the Meet link comes last: Google refusing it never loses the call,
 * its page says so. `projectId` null: an internal meeting, or with `deal` a
 * deal's call (BIZ 6): no member invited (the deal's readers see it), its
 * agenda prepared by the code (the terms still to settle).
 */
export async function planCall(
  session: Session,
  form: FormData,
  projectId: string | null,
  deal: { id: string; agenda: AgendaItem[] | null } | null = null,
): Promise<
  | { ok: true; id: string; meetFailed: boolean }
  | { ok: false; error: CallErrorCode }
> {
  const title = text(form, "title");
  if (!title || title.length > 200)
    return { ok: false, error: "title_required" };
  const slot = slotOf(form);
  if (!slot.ok) return slot;
  const google = wantsGoogleMeet(form);
  const meetingUrl = google ? null : meetingUrlOf(form);
  if (meetingUrl === undefined) return { ok: false, error: "link_invalid" };
  const picked = attendeesOf(form);
  if (!picked) return { ok: false, error: "invalid_input" };
  const guestInput = guestsOf(form);
  if (!guestInput) return { ok: false, error: "guest_email_invalid" };
  const guests = await resolveGuests(session.supabase, guestInput);
  if (!guests.ok) return guests;
  const me = session.access.personId;
  const attendees = deal ? [] : picked.filter((id) => id !== me);

  const organizationId = session.access.organizationId!;
  const { data, error } = await session.supabase
    .from("calls")
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      deal_id: deal?.id ?? null,
      agenda: deal?.agenda?.length ? deal.agenda : null,
      title,
      occurred_at: slot.slot.start.toISOString(),
      ends_at: slot.slot.end.toISOString(),
      meeting_url: meetingUrl,
      // Recording consent is given by contract.
      consent: "granted",
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[calls] create failed:", error?.message);
    return {
      ok: false,
      error: projectId || deal ? "forbidden" : "save_failed",
    };
  }

  // Each invitation notifies its member (database trigger).
  if (projectId)
    await inviteProjectTeam({
      callId: data.id,
      organizationId,
      projectId,
      mePersonId: me,
      personIds: attendees,
    });
  else if (attendees.length > 0) {
    const { error: inviteError } = await session.supabase
      .from("call_attendees")
      .insert(
        attendees.map((personId) => ({
          call_id: data.id,
          organization_id: organizationId,
          person_id: personId,
        })),
      );
    if (inviteError)
      console.error("[calls] invite failed:", inviteError.message);
    else await schedulePendingPushes();
  }
  await saveGuests(session.supabase, {
    callId: data.id,
    organizationId,
    guests: guests.guests,
  });

  const meetFailed =
    google &&
    !(await attachGoogleMeet(session.supabase, {
      callId: data.id,
      title,
      slot: slot.slot,
      memberIds: me ? [me, ...attendees] : attendees,
      guests: guests.guests,
    }));
  return { ok: true, id: data.id, meetFailed };
}

const attendeesSchema = z.array(z.uuid()).max(50);

// The members picked in the form (a JSON list of person ids); null if invalid.
function attendeesOf(form: FormData): string[] | null {
  try {
    const parsed = attendeesSchema.safeParse(
      JSON.parse(text(form, "attendees") || "[]"),
    );
    return parsed.success ? [...new Set(parsed.data)] : null;
  } catch {
    return null;
  }
}
