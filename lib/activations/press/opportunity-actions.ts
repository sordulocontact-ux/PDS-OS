"use server";

import { z } from "zod";

import {
  activationDone,
  activationFailure,
  invalid,
  textOrNull,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { parisInstant } from "@/lib/calls/calendar";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.activationPress.opportunities;
const TYPES = [
  "interview",
  "article",
  "review",
  "radio",
  "session",
  "info_request",
  "other",
] as const;
const STATUSES = [
  "proposed",
  "availability",
  "confirmed",
  "done",
  "broadcast_declared",
  "no_broadcast",
  "cancelled",
] as const;
const SLOTTED = ["confirmed", "done", "broadcast_declared", "no_broadcast"];

const schema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  targetId: z.uuid(),
  opportunityId: z.uuid().nullable(),
  type: z.enum(TYPES),
  status: z.enum(STATUSES),
  format: z.string().max(120),
  subject: z.string().max(500),
  // "YYYY-MM-DDTHH:mm", Paris time (datetime-local), or "".
  scheduledAt: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    z.literal(""),
  ]),
  location: z.string().max(500),
  participants: z.string().max(500),
  pdsPersonId: z.union([z.uuid(), z.literal("")]),
  constraints: z.string().max(1000),
  confirmedByName: z.string().max(200),
  confirmationChannel: z.union([
    z.enum(["email", "dm", "phone", "other"]),
    z.literal(""),
  ]),
  confirmationProofUrl: z.union([
    z.url({ protocol: /^https?$/ }).max(2000),
    z.literal(""),
  ]),
  statusNote: z.string().max(1000),
});

/** An opportunity created or updated ; a confirmed slot needs its date and
 * who confirmed by which channel (checked here and by the database). */
export async function saveOpportunity(
  input: z.input<typeof schema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return invalid(fr.activations.errors.urlInvalid);
  const v = parsed.data;
  if (SLOTTED.includes(v.status) && !v.scheduledAt)
    return invalid(t.slotRequired);
  if (
    SLOTTED.includes(v.status) &&
    (!v.confirmedByName.trim() || !v.confirmationChannel)
  )
    return invalid(t.confirmationRequired);
  const [day, time] = v.scheduledAt ? v.scheduledAt.split("T") : [null, null];
  const values = {
    type: v.type,
    status: v.status,
    format: textOrNull(v.format),
    subject: textOrNull(v.subject),
    scheduled_at:
      day && time
        ? parisInstant(
            day,
            Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)),
          ).toISOString()
        : null,
    location: textOrNull(v.location),
    participants: textOrNull(v.participants),
    pds_person_id: textOrNull(v.pdsPersonId),
    constraints_note: textOrNull(v.constraints),
    confirmed_by_name: textOrNull(v.confirmedByName),
    confirmation_channel: v.confirmationChannel || null,
    confirmation_proof_url: textOrNull(v.confirmationProofUrl),
    status_note: textOrNull(v.statusNote),
  };
  const supabase = await createClient();
  const { error } = v.opportunityId
    ? await supabase
        .from("press_opportunities")
        .update(values)
        .eq("id", v.opportunityId)
    : await supabase.from("press_opportunities").insert({
        ...values,
        target_id: v.targetId,
        organization_id: access.organizationId ?? "",
        project_id: v.projectId,
        activation_id: v.activationId,
      });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

/** « Enregistrer le brief » : the text prepared by code, as edited. */
export async function saveInterviewBrief(input: {
  projectId: string;
  opportunityId: string;
  brief: string;
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      opportunityId: z.uuid(),
      brief: z.string().max(20000),
    })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase
    .from("press_opportunities")
    .update({ brief: textOrNull(parsed.data.brief) })
    .eq("id", parsed.data.opportunityId);
  return error
    ? activationFailure(error)
    : activationDone(parsed.data.projectId);
}
