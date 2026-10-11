"use server";

import { z } from "zod";

import {
  AGENCY_FIELDS,
  METRIC_OF_FIELD,
  type AgencyField,
} from "@/lib/activations/agency/fields";
import { mapRows } from "@/lib/activations/agency/parse";
import {
  activationDone,
  activationFailure,
  invalid,
  textOrNull,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.activationAgency;
const ALL_FIELDS = [
  ...new Set([...AGENCY_FIELDS.influence, ...AGENCY_FIELDS.press]),
] as [string, ...string[]];
const DECISIONS = [
  "to_review",
  "validated",
  "refused",
  "to_discuss",
  "waiting_info",
  "to_fix",
] as const;

/**
 * « Saisir une ligne » (a plan received as a PDF or a message) : recorded as
 * a read of the source like any other — the current rows unchanged plus the
 * new one — and only the new one applied. Its values stay agency data.
 */
export async function addManualAgencyRow(input: {
  projectId: string;
  sourceId: string;
  values: Record<string, string>;
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      sourceId: z.uuid(),
      values: z.record(z.enum(ALL_FIELDS), z.string().max(2000)),
    })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const { projectId, sourceId, values } = parsed.data;
  const supabase = await createClient();
  const [{ data: source }, { data: current }] = await Promise.all([
    supabase
      .from("agency_sources")
      .select("key_fields")
      .eq("id", sourceId)
      .single(),
    supabase
      .from("agency_rows")
      .select("row_key, raw, current")
      .eq("source_id", sourceId)
      .is("absent_since", null),
  ]);
  if (!source) return invalid(fr.activations.errors.notFound);
  // The field labels are the columns of a manual entry.
  const fields = Object.keys(values) as AgencyField[];
  const headers = fields.map((f) => t.fieldLabels[f]);
  const mapping = Object.fromEntries(fields.map((f) => [f, t.fieldLabels[f]]));
  const { rows } = mapRows(
    { headers, rows: [fields.map((f) => values[f] ?? "")] },
    mapping,
    source.key_fields,
    t.preview.errorsMessages,
  );
  const added = rows[0];
  if (!added) return invalid(t.preview.errorsMessages.missingKey);
  const { data: snapshot, error } = await supabase.rpc(
    "record_agency_preview",
    {
      p_source_id: sourceId,
      p_file_id: null,
      p_headers: headers,
      p_rows: [
        ...(current ?? []).map((r) => ({
          key: r.row_key,
          position: null,
          raw: r.raw,
          mapped: r.current,
          errors: [],
        })),
        added,
      ],
      p_errors: [],
    },
  );
  if (error || !snapshot) return activationFailure(error ?? {});
  const applied = await supabase.rpc("apply_agency_snapshot", {
    p_snapshot_id: snapshot,
    p_keys: [added.key],
  });
  return applied.error
    ? activationFailure(applied.error)
    : activationDone(projectId);
}

/** The PDS decision and its internal note : never touched by a refresh. */
export async function decideAgencyRow(input: {
  projectId: string;
  rowId: string;
  decision: (typeof DECISIONS)[number];
  note: string;
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      rowId: z.uuid(),
      decision: z.enum(DECISIONS),
      note: z.string().max(2000),
    })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase
    .from("agency_rows")
    .update({
      pds_decision: parsed.data.decision,
      pds_note: textOrNull(parsed.data.note),
    })
    .eq("id", parsed.data.rowId);
  return error
    ? activationFailure(error)
    : activationDone(parsed.data.projectId);
}

/** « Rattacher au Réseau » : a person links the row to the profile ; nothing
 * is merged by itself. */
export async function linkAgencyRow(input: {
  projectId: string;
  rowId: string;
  contactId: string | null;
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      rowId: z.uuid(),
      contactId: z.uuid().nullable(),
    })
    .safeParse(input);
  if (!parsed.success) return invalid(fr.activationWork.errors.contactRequired);
  const supabase = await createClient();
  const { error } = await supabase
    .from("agency_rows")
    .update({ contact_id: parsed.data.contactId })
    .eq("id", parsed.data.rowId);
  return error
    ? activationFailure(error)
    : activationDone(parsed.data.projectId);
}

export type ImportResult =
  { ok: true; count: number } | { ok: false; error: string };

/**
 * « Importer les statistiques » : each figure of the current rows becomes a
 * snapshot dated today, source « agency », declared ; the earlier snapshots
 * stay. A row linked to the Réseau also gives its audience as a dated
 * observation of the profile (never overwriting the earlier ones).
 */
export async function importAgencyMetrics(input: {
  projectId: string;
  activationId: string;
  sourceId: string;
}): Promise<ImportResult> {
  const access = await requireApproved();
  const parsed = z
    .object({ projectId: z.uuid(), activationId: z.uuid(), sourceId: z.uuid() })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const { projectId, activationId, sourceId } = parsed.data;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("agency_rows")
    .select("id, contact_id, current")
    .eq("source_id", sourceId)
    .is("absent_since", null);
  const today = todayInParis();
  const org = access.organizationId ?? "";
  const metrics = (rows ?? []).flatMap((r) => {
    const current = (r.current ?? {}) as Record<string, unknown>;
    return Object.entries(METRIC_OF_FIELD).flatMap(([field, metric]) => {
      const value = current[field];
      if (typeof value !== "number") return [];
      return [
        {
          activation_id: activationId,
          agency_row_id: r.id,
          metric,
          value,
          unit: metric === "engagement_rate" ? "percent" : "count",
          platform:
            typeof current.platform === "string"
              ? current.platform.slice(0, 60)
              : null,
          source: "agency",
          method: t.agencyData,
          collected_on: today,
          organization_id: org,
          project_id: projectId,
        },
      ];
    });
  });
  const audiences = (rows ?? []).flatMap((r) => {
    const followers = (r.current as Record<string, unknown>)?.followers;
    return r.contact_id && typeof followers === "number"
      ? [
          {
            organization_id: org,
            contact_id: r.contact_id,
            kind: "followers",
            value: followers,
            unit: "count",
            observed_on: today,
            source: "agency",
            activation_id: activationId,
          },
        ]
      : [];
  });
  if (metrics.length === 0) return invalid(t.sources.nothingToImport);
  const { error } = await supabase.from("activation_metrics").insert(metrics);
  if (error) return activationFailure(error);
  if (audiences.length > 0) {
    const obs = await supabase.from("network_observations").insert(audiences);
    if (obs.error)
      console.error("importAgencyMetrics observations:", obs.error.message);
  }
  activationDone(projectId);
  return { ok: true, count: metrics.length };
}
