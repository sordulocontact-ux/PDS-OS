"use server";

import { z } from "zod";

import {
  CHECK_METHODS,
  CHECK_RESULTS,
  EVIDENCE_KINDS,
  EVIDENCE_SOURCES,
  METRIC_SOURCES,
  METRIC_UNITS,
  METRICS,
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
const optionalDate = z.union([z.iso.date(), z.literal("")]).optional();
const url = z
  .union([z.url({ protocol: /^https?$/ }).max(2000), z.literal("")])
  .optional();
const scope = { projectId: z.uuid(), activationId: z.uuid() };

const evidenceSchema = z.object({
  ...scope,
  targetId: z.uuid().nullable(),
  agencyRowId: z.uuid().nullable(),
  kind: z.enum(EVIDENCE_KINDS),
  platform: z.string().max(60).optional(),
  url,
  fileId: z.uuid().nullable(),
  declaredOn: optionalDate,
  declaredSource: z.enum(EVIDENCE_SOURCES),
  note: z.string().max(2000).optional(),
});

/** « Déclarer une preuve » : a link, a file or the declaration's source ;
 * it stays unverified until a separate check. */
export async function declareEvidence(
  input: z.input<typeof evidenceSchema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = evidenceSchema.safeParse(input);
  if (!parsed.success) return invalid(e.urlInvalid);
  const v = parsed.data;
  if (!textOrNull(v.url) && !v.fileId && !textOrNull(v.note))
    return invalid(e.somethingRequired);
  const supabase = await createClient();
  const { error } = await supabase.from("activation_evidence").insert({
    activation_id: v.activationId,
    target_id: v.targetId,
    agency_row_id: v.agencyRowId,
    kind: v.kind,
    platform: textOrNull(v.platform),
    url: textOrNull(v.url),
    file_id: v.fileId,
    declared_on: textOrNull(v.declaredOn),
    declared_source: v.declaredSource,
    declaration_note: textOrNull(v.note),
    // Overwritten from the activation by the database.
    organization_id: access.organizationId ?? "",
    project_id: v.projectId,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

const checkSchema = z.object({
  projectId: z.uuid(),
  evidenceId: z.uuid(),
  result: z.enum(CHECK_RESULTS),
  method: z.enum(CHECK_METHODS),
  note: z.string().max(2000),
});

/** « Vérifier » : the result, its method, who and when (stamped by the
 * database) ; a failure never erases the declaration. */
export async function checkEvidence(
  input: z.input<typeof checkSchema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = checkSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  if (v.method === "other" && !v.note.trim()) return invalid(e.methodRequired);
  const supabase = await createClient();
  const { error } = await supabase.from("activation_evidence_checks").insert({
    evidence_id: v.evidenceId,
    result: v.result,
    method: v.method,
    note: textOrNull(v.note),
    // Overwritten from the evidence by the database.
    organization_id: access.organizationId ?? "",
    project_id: v.projectId,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

export async function withdrawEvidence(input: {
  projectId: string;
  evidenceId: string;
  reason: string;
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      evidenceId: z.uuid(),
      reason: z.string().trim().min(1).max(1000),
    })
    .safeParse(input);
  if (!parsed.success) return invalid(e.reasonRequired);
  const supabase = await createClient();
  const { error } = await supabase
    .from("activation_evidence")
    .update({ withdrawn_reason: parsed.data.reason })
    .eq("id", parsed.data.evidenceId);
  return error
    ? activationFailure(error)
    : activationDone(parsed.data.projectId);
}

const metricSchema = z.object({
  ...scope,
  targetId: z.uuid().nullable(),
  agencyRowId: z.uuid().nullable(),
  metric: z.enum(METRICS),
  label: z.string().max(80).optional(),
  value: z.number().nonnegative().max(1e12),
  unit: z.enum(METRIC_UNITS),
  platform: z.string().max(60).optional(),
  periodStart: optionalDate,
  periodEnd: optionalDate,
  source: z.enum(METRIC_SOURCES),
  method: z.string().max(300).optional(),
  collectedOn: z.iso.date(),
});

/** « Noter un relevé » : always declared when recorded. */
export async function recordMetric(
  input: z.input<typeof metricSchema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = metricSchema.safeParse(input);
  if (!parsed.success) return invalid(e.valueRequired);
  const v = parsed.data;
  if (v.metric === "other" && !textOrNull(v.label))
    return invalid(e.labelRequired);
  const supabase = await createClient();
  const { error } = await supabase.from("activation_metrics").insert({
    activation_id: v.activationId,
    target_id: v.targetId,
    agency_row_id: v.agencyRowId,
    metric: v.metric,
    label: v.metric === "other" ? textOrNull(v.label) : null,
    value: v.value,
    unit: v.unit,
    platform: textOrNull(v.platform),
    period_start: textOrNull(v.periodStart),
    period_end: textOrNull(v.periodEnd),
    source: v.source,
    method: textOrNull(v.method),
    collected_on: v.collectedOn,
    // Overwritten from the activation by the database.
    organization_id: access.organizationId ?? "",
    project_id: v.projectId,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

/** « Marquer vérifié / contesté » : a separate act on one snapshot. */
export async function setMetricVerification(input: {
  projectId: string;
  metricId: string;
  verification: "verified" | "contested";
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      metricId: z.uuid(),
      verification: z.enum(["verified", "contested"]),
    })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase
    .from("activation_metrics")
    .update({ verification: parsed.data.verification })
    .eq("id", parsed.data.metricId);
  return error
    ? activationFailure(error)
    : activationDone(parsed.data.projectId);
}

export async function invalidateMetric(input: {
  projectId: string;
  metricId: string;
  reason: string;
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      metricId: z.uuid(),
      reason: z.string().trim().min(1).max(1000),
    })
    .safeParse(input);
  if (!parsed.success) return invalid(e.reasonRequired);
  const supabase = await createClient();
  const { error } = await supabase
    .from("activation_metrics")
    .update({ invalidation_reason: parsed.data.reason })
    .eq("id", parsed.data.metricId);
  return error
    ? activationFailure(error)
    : activationDone(parsed.data.projectId);
}
