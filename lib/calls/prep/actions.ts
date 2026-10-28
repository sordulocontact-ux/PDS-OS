"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { PREP_ADAPTERS } from "@/lib/calls/prep/adapters";
import {
  fileTypedGuests,
  loadPrepPool,
  resolveAttendees,
} from "@/lib/calls/prep/people";
import {
  PREP_FORMATS,
  PREPARED_CALL_KINDS,
  type PreparedCallInput,
  type PreparedCallResult,
} from "@/lib/calls/prep/types";
import { agendaSchema, buildPreparedAgenda } from "@/lib/calls/prepare-schema";
import { attachGoogleMeet, saveGuests } from "@/lib/calls/schedule";
import { fr } from "@/lib/i18n/fr";
import { googleMeetConfigured } from "@/lib/integrations/google-calendar";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  kind: z.enum(PREPARED_CALL_KINDS),
  projectId: z.uuid(),
  target: z.record(z.string().min(1).max(40), z.uuid()),
  title: z.string().trim().min(1).max(200),
  occurredAt: z.iso.datetime({ offset: true }),
  format: z.enum(PREP_FORMATS),
  meetingUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || /^https:\/\/\S+$/.test(value)),
  goal: z.string().trim().min(1).max(500),
  // "m:<id>", "c:<id>" or "e:<address>": checked against the pool below.
  attendeeKeys: z.array(z.string().min(3).max(330)).min(2).max(30),
  agenda: agendaSchema,
  documentIds: z.array(z.uuid()).max(30),
  extraIds: z.array(z.uuid()).max(50),
});

// A video call without an agenda's length takes an hour in the calendar.
const DEFAULT_SLOT_MINUTES = 60;

/**
 * « Confirmer et inviter » of the common call form, for every kind
 * (docs/ARCHITECTURE.md § 4 ter): the agenda rebuilt on the server from
 * what the module prepared, the participants checked against the project's
 * team and the Réseau, then the module's SQL function writes the call and
 * its link table. Team members are invited in the app (notified by
 * trigger), outside people get a call_guests row; Google sends their
 * e-mail only when it is connected, otherwise nothing leaves PDS OS yet.
 */
export async function createPreparedCall(
  input: PreparedCallInput,
): Promise<PreparedCallResult> {
  const t = fr.callPrep;
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.calls.errors.invalid_input };
  const p = parsed.data;
  const adapter = PREP_ADAPTERS[p.kind];

  const access = await requireApproved();
  const [prepared, pool] = await Promise.all([
    adapter.points({
      access,
      projectId: p.projectId,
      target: p.target,
      extraIds: p.extraIds,
    }),
    loadPrepPool(p.projectId),
  ]);
  if ("error" in prepared)
    return {
      ok: false,
      error: prepared.error === "not_found" ? t.failed : prepared.error,
    };
  const attendees = resolveAttendees(pool, p.attendeeKeys);
  if (!attendees) return { ok: false, error: fr.calls.errors.invalid_input };

  const agenda = buildPreparedAgenda(prepared.points, p.agenda);
  const supabase = await createClient();
  await fileTypedGuests(supabase, access.organizationId!, attendees);
  const { callId, error } = await adapter.create(supabase, {
    projectId: p.projectId,
    target: p.target,
    title: p.title,
    occurredAt: p.occurredAt,
    format: p.format,
    meetingUrl: p.meetingUrl,
    goal: p.goal,
    agenda,
    attendees,
    documentIds: p.documentIds,
    extraIds: prepared.extraIds ?? p.extraIds,
  });
  if (error || !callId) {
    console.error("createPreparedCall:", p.kind, error?.code, error?.message);
    const own = error ? adapter.failure?.(error) : null;
    return {
      ok: false,
      error:
        own ??
        (error?.code === "42501"
          ? t.forbidden
          : error?.message.includes("stage_locked")
            ? t.locked
            : t.failed),
    };
  }

  // The team, invited in the app (never the person who creates the call).
  const memberIds = attendees.memberIds.filter((id) => id !== access.personId);
  if (memberIds.length) {
    const { error: inviteError } = await supabase.from("call_attendees").insert(
      memberIds.map((personId) => ({
        call_id: callId,
        organization_id: access.organizationId!,
        person_id: personId,
      })),
    );
    if (inviteError)
      console.error("[calls] prepared invite failed:", inviteError.message);
  }
  await saveGuests(supabase, {
    callId,
    organizationId: access.organizationId!,
    guests: attendees.guests,
  });
  if (p.format === "video" && !p.meetingUrl && googleMeetConfigured()) {
    const start = new Date(p.occurredAt);
    const minutes =
      agenda.reduce((sum, item) => sum + item.minutes, 0) ||
      DEFAULT_SLOT_MINUTES;
    await attachGoogleMeet(supabase, {
      callId,
      title: p.title,
      slot: { start, end: new Date(start.getTime() + minutes * 60_000) },
      memberIds: attendees.memberIds,
      guests: attendees.guests,
    });
  }
  await schedulePendingPushes();
  revalidatePath(routes.project(p.projectId), "layout");
  return { ok: true, callId };
}
