"use server";

import { z } from "zod";

import {
  ACTIVATION_KINDS,
  ACTIVATION_MODES,
  PRIORITIES,
  REASONED_STATUSES,
  SETTABLE_STATUSES,
  kindHasMode,
} from "@/lib/activations/model";
import {
  activationDone,
  activationFailure,
  invalid,
  textOrNull,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const e = fr.activations.errors;
const date = z.union([z.iso.date(), z.literal("")]).optional();

const fields = {
  title: z.string().trim().min(1).max(200),
  objective: z.string().max(2000).optional(),
  description: z.string().max(4000).optional(),
  ownerPersonId: z.union([z.uuid(), z.literal("")]).optional(),
  priority: z.enum(PRIORITIES),
  startsOn: date,
  dueOn: date,
};

const createSchema = z.object({
  projectId: z.uuid(),
  kind: z.enum(ACTIVATION_KINDS),
  mode: z.enum(ACTIVATION_MODES).nullable(),
  source: z
    .object({
      kind: z.enum(["lever", "deliverable", "handoff"]),
      id: z.uuid(),
    })
    .nullable(),
  ...fields,
});

export type CreateActivationResult =
  { ok: true; id: string } | { ok: false; error: string };

/** « Créer l'activation » : by the project's owner, by hand or from a source
 * of the Stratégie or the Production (a link, never a copy). */
export async function createActivation(
  input: z.input<typeof createSchema>,
): Promise<CreateActivationResult> {
  const access = await requireApproved();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success || !access.organizationId)
    return { ok: false, error: e.invalid };
  const v = parsed.data;
  if (kindHasMode(v.kind) && !v.mode)
    return { ok: false, error: e.modeRequired };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_activations")
    .insert({
      organization_id: access.organizationId,
      project_id: v.projectId,
      kind: v.kind,
      mode: kindHasMode(v.kind) ? v.mode : null,
      title: v.title,
      objective: textOrNull(v.objective),
      description: textOrNull(v.description),
      owner_person_id: textOrNull(v.ownerPersonId),
      priority: v.priority,
      starts_on: textOrNull(v.startsOn),
      due_on: textOrNull(v.dueOn),
      source_kind: v.source?.kind ?? "manual",
      lever_id: v.source?.kind === "lever" ? v.source.id : null,
      deliverable_id: v.source?.kind === "deliverable" ? v.source.id : null,
      handoff_id: v.source?.kind === "handoff" ? v.source.id : null,
    })
    .select("id")
    .single();
  if (error || !data) return activationFailure(error ?? {});
  activationDone(v.projectId);
  return { ok: true, id: data.id };
}

const updateSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  mode: z.enum(ACTIVATION_MODES).nullable(),
  evidenceExpected: z.boolean(),
  metricsExpected: z.boolean(),
  ...fields,
});

/** « Modifier » : identity, owner, dates, what is expected, the mode (its
 * history kept). */
export async function updateActivation(
  input: z.input<typeof updateSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("marketing_activations")
    .select("kind")
    .eq("id", v.activationId)
    .single();
  if (!current) return invalid(e.notFound);
  const { error } = await supabase
    .from("marketing_activations")
    .update({
      title: v.title,
      objective: textOrNull(v.objective),
      description: textOrNull(v.description),
      owner_person_id: textOrNull(v.ownerPersonId),
      priority: v.priority,
      starts_on: textOrNull(v.startsOn),
      due_on: textOrNull(v.dueOn),
      evidence_expected: v.evidenceExpected,
      metrics_expected: v.metricsExpected,
      ...(current.kind === "influence" || current.kind === "press"
        ? { mode: v.mode }
        : {}),
    })
    .eq("id", v.activationId);
  return error ? activationFailure(error) : activationDone(v.projectId);
}

const statusSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  status: z.enum(SETTABLE_STATUSES as [string, ...string[]]),
  reason: z.string().max(1000),
});

/** The operational status, set by a person, journaled by the database. */
export async function setActivationStatus(
  input: z.input<typeof statusSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const reasoned = (REASONED_STATUSES as readonly string[]).includes(v.status);
  if (reasoned && !v.reason.trim()) return invalid(e.reasonRequired);
  const supabase = await createClient();
  const { error } = await supabase
    .from("marketing_activations")
    .update({
      status: v.status,
      status_reason: reasoned ? v.reason.trim() : null,
    })
    .eq("id", v.activationId);
  return error ? activationFailure(error) : activationDone(v.projectId);
}

const closeSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  kind: z.enum(["definitive", "with_reserves"]),
  reserves: z
    .array(
      z.object({
        key: z.string().max(60),
        count: z.number().int().optional(),
        label: z.string().max(200),
      }),
    )
    .max(20),
  note: z.string().max(2000),
});

/** « Clôturer » : the reserves come from the code's list, shown to the
 * person and kept as shown. */
export async function closeActivation(
  input: z.input<typeof closeSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = closeSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_activation", {
    p_activation_id: v.activationId,
    p_kind: v.kind,
    p_reserves: v.reserves.length > 0 ? v.reserves : null,
    p_note: v.note,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

export async function reopenActivation(input: {
  projectId: string;
  activationId: string;
  reason: string;
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      activationId: z.uuid(),
      reason: z.string().trim().min(1).max(1000),
    })
    .safeParse(input);
  if (!parsed.success) return invalid(e.reasonRequired);
  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_activation", {
    p_activation_id: parsed.data.activationId,
    p_reason: parsed.data.reason,
  });
  return error
    ? activationFailure(error)
    : activationDone(parsed.data.projectId);
}
