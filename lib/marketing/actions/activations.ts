"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import {
  ACTIVATION_KINDS,
  ACTIVATION_STATUSES,
  AVAILABILITIES,
  EVIDENCE_KINDS,
} from "@/lib/marketing/model";
import { failOutcome, marketingDone } from "@/lib/marketing/result";
import { createClient } from "@/lib/supabase/server";
import type { ActionOutcome } from "@/lib/utils/action-outcome";

// Activations and evidence (ticket « Suivi & bilan », lot 1): written by the
// project's owner and its creative directors; RLS and the table's triggers
// decide again (who verified, who archived, a changed link checked anew).

const e = fr.marketing.errors;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
const optionalDate = z
  .union([z.iso.date(), z.literal("")])
  .transform((v) => v || null);
const optionalUuid = z
  .union([z.uuid(), z.literal("")])
  .transform((v) => v || null);

const activationInput = z.object({
  projectId: z.uuid(),
  id: optionalUuid,
  title: z.string().trim().min(1).max(200),
  kind: z.enum(ACTIVATION_KINDS),
  status: z.enum(ACTIVATION_STATUSES),
  ownerPersonId: optionalUuid,
  // « deliverable:<id> », « lever:<id> » or empty.
  source: z.string().regex(/^((deliverable|lever):[0-9a-f-]{36})?$/),
  startsOn: optionalDate,
  endsOn: optionalDate,
  note: optionalText(2000),
});

async function organizationId(): Promise<string | null> {
  const access = await requireApproved();
  return access.organizationId;
}

/** « Ajouter une activation » or « Modifier ». */
export async function saveActivation(
  input: z.input<typeof activationInput>,
): Promise<ActionOutcome> {
  const p = activationInput.safeParse(input);
  if (!p.success) return failOutcome(e.invalid);
  const d = p.data;
  if (d.startsOn && d.endsOn && d.endsOn < d.startsOn)
    return failOutcome(e.invalid);
  const org = await organizationId();
  if (!org) return failOutcome(e.forbidden);
  const [sourceKind, sourceId] = d.source ? d.source.split(":") : [null, null];
  const values = {
    title: d.title,
    kind: d.kind,
    status: d.status,
    owner_person_id: d.ownerPersonId,
    deliverable_id: sourceKind === "deliverable" ? sourceId : null,
    lever_id: sourceKind === "lever" ? sourceId : null,
    starts_on: d.startsOn,
    ends_on: d.endsOn,
    note: d.note,
  };
  const supabase = await createClient();
  if (d.id) {
    const { data, error } = await supabase
      .from("marketing_activations")
      .update(values)
      .eq("id", d.id)
      .eq("project_id", d.projectId)
      .select("id");
    if (!error && (data ?? []).length === 0) return failOutcome(e.forbidden);
    return marketingDone(d.projectId, error);
  }
  const { error } = await supabase.from("marketing_activations").insert({
    ...values,
    organization_id: org,
    project_id: d.projectId,
  });
  return marketingDone(d.projectId, error);
}

const archiveInput = z.object({
  projectId: z.uuid(),
  id: z.uuid(),
  archived: z.boolean(),
});

/** « Archiver » / « Restaurer »: never deleted, the time is the database's. */
export async function setActivationArchived(
  input: z.input<typeof archiveInput>,
): Promise<ActionOutcome> {
  const p = archiveInput.safeParse(input);
  if (!p.success) return failOutcome(e.invalid);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_activations")
    .update({ archived_at: p.data.archived ? new Date().toISOString() : null })
    .eq("id", p.data.id)
    .eq("project_id", p.data.projectId)
    .select("id");
  if (!error && (data ?? []).length === 0) return failOutcome(e.forbidden);
  return marketingDone(p.data.projectId, error);
}

const evidenceInput = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  id: optionalUuid,
  kind: z.enum(EVIDENCE_KINDS),
  label: z.string().trim().min(1).max(200),
  url: z
    .union([
      z
        .string()
        .trim()
        .regex(/^https:\/\/\S+$/)
        .max(2048),
      z.literal(""),
    ])
    .transform((v) => v || null),
  platform: optionalText(80),
  metric: optionalText(80),
  // Typed with a comma or a dot; empty = no value.
  value: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, "").replace(",", "."))
    .refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v))
    .transform((v) => (v === "" ? null : Number(v))),
  periodStart: optionalDate,
  periodEnd: optionalDate,
  availability: z.union([z.enum(AVAILABILITIES), z.literal("")]),
  reportedBy: optionalText(200),
  observedOn: optionalDate,
  // A new evidence is declared or to verify; « verified » is its own action.
  toVerify: z.boolean(),
});

/** « Déclarer une publication / retombée », « Relever une statistique ». */
export async function saveEvidence(
  input: z.input<typeof evidenceInput>,
): Promise<ActionOutcome> {
  const p = evidenceInput.safeParse(input);
  if (!p.success) return failOutcome(e.invalid);
  const d = p.data;
  const statistic = d.kind === "statistic";
  if (statistic && !d.metric) return failOutcome(e.invalid);
  if (statistic && d.availability === "unavailable" && d.value !== null)
    return failOutcome(e.unavailableValue);
  if (statistic && d.availability !== "unavailable" && d.value === null)
    return failOutcome(e.valueRequired);
  const values = {
    label: d.label,
    url: d.url,
    platform: d.platform,
    metric: statistic ? d.metric : null,
    value: statistic ? d.value : null,
    period_start: statistic ? d.periodStart : null,
    period_end: statistic ? d.periodEnd : null,
    availability: statistic ? d.availability || "available" : null,
    reported_by: d.reportedBy,
    observed_on: d.observedOn,
  };
  const supabase = await createClient();
  if (d.id) {
    const { data, error } = await supabase
      .from("marketing_evidence")
      .update(values)
      .eq("id", d.id)
      .eq("project_id", d.projectId)
      .select("id");
    if (!error && (data ?? []).length === 0) return failOutcome(e.forbidden);
    return marketingDone(d.projectId, error);
  }
  const org = await organizationId();
  if (!org) return failOutcome(e.forbidden);
  const { error } = await supabase.from("marketing_evidence").insert({
    ...values,
    organization_id: org,
    project_id: d.projectId,
    activation_id: d.activationId,
    kind: d.kind,
    verification: d.toVerify ? "to_verify" : "declared",
  });
  return marketingDone(d.projectId, error);
}

const evidenceStateInput = z.object({
  projectId: z.uuid(),
  id: z.uuid(),
  change: z.enum([
    "verified",
    "to_verify",
    "declared",
    "unreachable",
    "reachable",
    "archive",
  ]),
});

/**
 * Verify, ask for a check, flag an unreachable link, archive: one column each,
 * who and when written by the database.
 */
export async function changeEvidence(
  input: z.input<typeof evidenceStateInput>,
): Promise<ActionOutcome> {
  const p = evidenceStateInput.safeParse(input);
  if (!p.success) return failOutcome(e.invalid);
  const now = new Date().toISOString();
  const change = p.data.change;
  const values =
    change === "unreachable"
      ? { link_unreachable_at: now }
      : change === "reachable"
        ? { link_unreachable_at: null }
        : change === "archive"
          ? { archived_at: now }
          : { verification: change };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_evidence")
    .update(values)
    .eq("id", p.data.id)
    .eq("project_id", p.data.projectId)
    .select("id");
  if (!error && (data ?? []).length === 0) return failOutcome(e.forbidden);
  return marketingDone(p.data.projectId, error);
}
