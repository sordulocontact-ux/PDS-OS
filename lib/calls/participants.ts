import "server-only";

import { z } from "zod";

import { getAccess } from "@/lib/auth/dal";
import { loadCallContacts, loadCallMembers } from "@/lib/calls/invite";
import {
  emailParticipant,
  participantPool,
  type ParticipantsForm,
} from "@/lib/calls/prep/pool";
import { eventGuestsOf, type Guest } from "@/lib/calls/schedule";
import { loadMembers } from "@/lib/framing/related";
import { callPrep } from "@/lib/i18n/fr/call-prep";
import { schedule } from "@/lib/i18n/fr/calls-schedule";
import { setMeetEventGuests } from "@/lib/integrations/google-calendar";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

/**
 * What « Modifier les participants » reads and the Google event it keeps in
 * step (lib/calls/participants-actions.ts). Every read and write goes
 * through the user's session: RLS stays the guard.
 */

export async function participantsSession() {
  const access = await getAccess();
  if (access.state !== "approved" || !access.organizationId) return null;
  return { access, supabase: await createClient() };
}

export type ParticipantsSession = NonNullable<
  Awaited<ReturnType<typeof participantsSession>>
>;

/** The call and whether the viewer works on it (is_call_owner). */
export async function ownedCall(
  { supabase }: ParticipantsSession,
  callId: string,
) {
  if (!z.uuid().safeParse(callId).success) return null;
  const [{ data: call }, { data: owner }] = await Promise.all([
    supabase
      .from("calls")
      .select(
        "id, organization_id, project_id, created_by, google_event_id, ends_at",
      )
      .eq("id", callId)
      .maybeSingle(),
    supabase.rpc("is_call_owner", { p_call_id: callId }),
  ]);
  return call ? { call, owner: owner === true } : null;
}

export type OwnedCall = NonNullable<
  Awaited<ReturnType<typeof ownedCall>>
>["call"];

/** The field's choices (the project's team or the label's members, the
 * Réseau) and who takes part now. A member no longer offered (left the
 * project's team) stays in the field, so saving never drops them unasked. */
export async function readParticipantsForm(
  s: ParticipantsSession,
  call: OwnedCall,
): Promise<ParticipantsForm> {
  const me = s.access.personId;
  const [members, contacts, attendees, guests] = await Promise.all([
    call.project_id
      ? loadCallMembers(call.project_id).then((team) =>
          team.map((p) => ({ ...p, detail: callPrep.roles[p.place] })),
        )
      : loadMembers(s.access),
    loadCallContacts(),
    s.supabase
      .from("call_attendees")
      .select("person_id")
      .eq("call_id", call.id),
    s.supabase
      .from("call_guests")
      .select("email, name, contact_id")
      .eq("call_id", call.id),
  ]);
  const memberDetail = call.project_id
    ? schedule.projectMemberDetail
    : schedule.memberDetail;
  const pool = participantPool(
    members.filter((m) => m.personId !== me),
    contacts,
    { memberDetail, noEmail: schedule.contactNoEmail },
  );
  const byKey = new Map(pool.map((p) => [p.key, p]));
  const ids = (attendees.data ?? []).map((a) => a.person_id);
  const missing = ids.filter((id) => !byKey.has(`m:${id}`));
  const { data: others } = missing.length
    ? await s.supabase
        .from("people")
        .select("id, first_name, last_name")
        .in("id", missing)
    : { data: [] };
  const formerMembers = (others ?? []).map((p) => ({
    personId: p.id,
    name: personName(p.first_name, p.last_name),
  }));
  for (const entry of participantPool(formerMembers, [], {
    memberDetail,
    noEmail: schedule.contactNoEmail,
  }))
    byKey.set(entry.key, entry);

  const value = [
    ...ids.flatMap((id) => byKey.get(`m:${id}`) ?? []),
    ...(guests.data ?? []).map(
      (g) =>
        (g.contact_id && byKey.get(`c:${g.contact_id}`)) ||
        emailParticipant(g.email, g.name, schedule.externalDetail),
    ),
  ];
  return { pool, value };
}

/** Replaces the guests of the call's Google event (a call still to come):
 * Google invites the new ones and tells the ones taken off. False when
 * Google refused; the participants stay saved. */
export async function syncEventGuests(
  s: ParticipantsSession,
  call: OwnedCall,
  guests: Guest[],
): Promise<boolean> {
  if (!call.google_event_id) return true;
  if (call.ends_at && new Date(call.ends_at) <= new Date()) return true;
  try {
    const { data: kept } = await s.supabase
      .from("call_attendees")
      .select("person_id")
      .eq("call_id", call.id);
    const memberIds = [
      ...new Set([
        ...(call.created_by ? [call.created_by] : []),
        ...(kept ?? []).map((a) => a.person_id),
      ]),
    ];
    await setMeetEventGuests({
      eventId: call.google_event_id,
      guests: await eventGuestsOf(s.supabase, memberIds, guests),
    });
    return true;
  } catch (error) {
    console.error("[calls] google guests failed:", error);
    return false;
  }
}
