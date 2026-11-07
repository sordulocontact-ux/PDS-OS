"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { CallErrorCode } from "@/lib/calls/constants";
import { inviteProjectTeam } from "@/lib/calls/invite";
import {
  ownedCall,
  participantsSession,
  readParticipantsForm,
  syncEventGuests,
} from "@/lib/calls/participants";
import type { ParticipantsForm } from "@/lib/calls/prep/pool";
import { guestsSchema, resolveGuests, saveGuests } from "@/lib/calls/schedule";
import { schedulePendingPushes } from "@/lib/notifications/push";

/**
 * « Modifier les participants » of a call already planned (Ibé, 05/11/2026:
 * « Impossible d'ajouter des participants lorsque je suis en train d'éditer
 * la réunion »). Whoever works on the call (is_call_owner: the project's
 * owner, the meeting's creator) adds or takes off members and guests; the
 * RLS of call_attendees and call_guests checks every write. A member added
 * is told by the trigger call_invited; a call with a Google event gets its
 * guests replaced, and Google e-mails them.
 */

export type ParticipantsResult =
  { ok: true; googleFailed: boolean } | { ok: false; error: CallErrorCode };

/** Read when the form opens. */
export async function loadCallParticipants(
  callId: string,
): Promise<ParticipantsForm> {
  const s = await participantsSession();
  const found = s && (await ownedCall(s, callId));
  if (!s || !found?.owner) throw new Error("forbidden");
  return readParticipantsForm(s, found.call);
}

const attendeesSchema = z.array(z.uuid()).max(50);

/** Saves who takes part: the members and guests added are invited, the
 * ones taken off are no longer. */
export async function saveCallParticipants(
  callId: string,
  attendeeIds: string[],
  guestInput: Array<{ contactId: string } | { email: string }>,
): Promise<ParticipantsResult> {
  const s = await participantsSession();
  if (!s) return { ok: false, error: "unauthorized" };
  const picked = attendeesSchema.safeParse(attendeeIds);
  const guestsParsed = guestsSchema.safeParse(guestInput);
  if (!picked.success) return { ok: false, error: "invalid_input" };
  if (!guestsParsed.success) return { ok: false, error: "guest_email_invalid" };
  const found = await ownedCall(s, callId);
  if (!found) return { ok: false, error: "not_found" };
  if (!found.owner) return { ok: false, error: "forbidden" };
  const { call } = found;
  const guests = await resolveGuests(s.supabase, guestsParsed.data);
  if (!guests.ok) return guests;

  const me = s.access.personId;
  const wanted = new Set(picked.data.filter((id) => id !== me));
  const [{ data: nowAttending }, { data: nowGuests }] = await Promise.all([
    s.supabase.from("call_attendees").select("person_id").eq("call_id", callId),
    s.supabase.from("call_guests").select("email").eq("call_id", callId),
  ]);
  const attending = new Set((nowAttending ?? []).map((a) => a.person_id));
  const toRemove = [...attending].filter((id) => !wanted.has(id));
  const toAdd = [...wanted].filter((id) => !attending.has(id));
  const wantedEmails = new Set(guests.guests.map((g) => g.email));
  const invitedEmails = new Set((nowGuests ?? []).map((g) => g.email));
  const guestsToRemove = [...invitedEmails].filter((e) => !wantedEmails.has(e));
  const guestsToAdd = guests.guests.filter((g) => !invitedEmails.has(g.email));

  const removals = await Promise.all([
    toRemove.length
      ? s.supabase
          .from("call_attendees")
          .delete()
          .eq("call_id", callId)
          .in("person_id", toRemove)
      : { error: null },
    guestsToRemove.length
      ? s.supabase
          .from("call_guests")
          .delete()
          .eq("call_id", callId)
          .in("email", guestsToRemove)
      : { error: null },
  ]);
  const removeError = removals.find((r) => r.error)?.error;
  if (removeError) {
    console.error("[calls] participants removal failed:", removeError.message);
    return { ok: false, error: "save_failed" };
  }

  if (toAdd.length > 0 && call.project_id)
    await inviteProjectTeam({
      callId,
      organizationId: call.organization_id,
      projectId: call.project_id,
      mePersonId: me,
      personIds: toAdd,
    });
  else if (toAdd.length > 0) {
    const { error } = await s.supabase.from("call_attendees").insert(
      toAdd.map((personId) => ({
        call_id: callId,
        organization_id: call.organization_id,
        person_id: personId,
      })),
    );
    if (error) {
      console.error("[calls] participants invite failed:", error.message);
      return { ok: false, error: "save_failed" };
    }
    await schedulePendingPushes();
  }
  await saveGuests(s.supabase, {
    callId,
    organizationId: call.organization_id,
    guests: guestsToAdd,
  });

  const changed =
    toAdd.length + toRemove.length + guestsToAdd.length + guestsToRemove.length;
  const googleOk =
    changed === 0 || (await syncEventGuests(s, call, guests.guests));
  refresh();
  return { ok: true, googleFailed: !googleOk };
}
