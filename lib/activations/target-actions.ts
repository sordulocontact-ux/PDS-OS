"use server";

import { z } from "zod";

import { PRIORITIES, TARGET_OUTCOMES } from "@/lib/activations/model";
import {
  activationDone,
  activationFailure,
  invalid,
  textOrNull,
} from "@/lib/activations/result";
import { warningsFor, type TargetWarning } from "@/lib/activations/targets";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

/** The alerts of a profile before it is added (read with the user's
 * session : only campaigns they see). */
export async function targetWarnings(input: {
  contactId: string;
  activationId: string;
  withAudience: boolean;
  // RP: the journalist picked, for « Doublon probable ».
  press?: { journalistId: string | null };
}): Promise<TargetWarning[]> {
  await requireApproved();
  const parsed = z
    .object({
      contactId: z.uuid(),
      activationId: z.uuid(),
      withAudience: z.boolean(),
      press: z.object({ journalistId: z.uuid().nullable() }).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return [];
  return warningsFor(
    parsed.data.contactId,
    parsed.data.activationId,
    parsed.data.withAudience,
    parsed.data.press ?? null,
  );
}

const addSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  contactId: z.uuid(),
  journalistId: z.uuid().nullable(),
  priority: z.enum(PRIORITIES),
  angle: z.string().max(2000),
  justification: z.string().max(2000),
  confirmedWarnings: z.array(z.string().max(40)).max(20),
});

export type AddTargetResult =
  | { ok: true; targetId: string; existed: boolean }
  | { ok: false; error: string };

/** Adds a profile of the Réseau to the campaign ; a second add of the same
 * profile opens the existing one (« Une tentative de doublon renvoie vers la
 * fiche existante »). */
export async function addTarget(
  input: z.input<typeof addSchema>,
): Promise<AddTargetResult> {
  const access = await requireApproved();
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return invalid(fr.activationWork.errors.contactRequired);
  const v = parsed.data;
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("activation_targets")
    .select("id")
    .eq("activation_id", v.activationId)
    .eq("contact_id", v.contactId)
    .maybeSingle();
  if (existing) return { ok: true, targetId: existing.id, existed: true };
  const { data, error } = await supabase
    .from("activation_targets")
    .insert({
      activation_id: v.activationId,
      contact_id: v.contactId,
      journalist_contact_id: v.journalistId,
      priority: v.priority,
      angle: textOrNull(v.angle),
      justification: textOrNull(v.justification),
      confirmed_warnings: v.confirmedWarnings,
      organization_id: access.organizationId ?? "",
      project_id: v.projectId,
    })
    .select("id")
    .single();
  if (error || !data) return activationFailure(error ?? {});
  activationDone(v.projectId);
  return { ok: true, targetId: data.id, existed: false };
}

const outcomeSchema = z.object({
  projectId: z.uuid(),
  targetId: z.uuid(),
  outcome: z.enum(TARGET_OUTCOMES).nullable(),
  reason: z.string().max(1000),
});

/** « Fixer l'issue » (or reopen with null) : who and when stamped by the
 * database, journaled. */
export async function setTargetOutcome(
  input: z.input<typeof outcomeSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = outcomeSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("activation_targets")
    .update({
      outcome: v.outcome,
      outcome_reason: v.outcome ? textOrNull(v.reason) : null,
    })
    .eq("id", v.targetId);
  return error ? activationFailure(error) : activationDone(v.projectId);
}
