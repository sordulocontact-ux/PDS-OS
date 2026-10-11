"use server";

import { z } from "zod";

import {
  AGENCY_FIELDS,
  DEFAULT_KEY_FIELDS,
  proposeMapping,
} from "@/lib/activations/agency/fields";
import { mapRows } from "@/lib/activations/agency/parse";
import { readSource } from "@/lib/activations/agency/read-source";
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

const t = fr.activationAgency;
const ALL_FIELDS = [
  ...new Set([...AGENCY_FIELDS.influence, ...AGENCY_FIELDS.press]),
] as [string, ...string[]];

const sourceSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  label: z.string().trim().min(1).max(120),
  kind: z.enum(["google_sheet", "file", "manual"]),
  url: z.union([
    z
      .string()
      .regex(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+/),
    z.literal(""),
  ]),
  sheetGid: z.union([z.string().regex(/^\d{1,12}$/), z.literal("")]),
  agencyContactId: z.uuid().nullable(),
  agencyPerson: z.string().max(200),
});

/** « Connecter une source » : read only, the agency keeps its own file. */
export async function createAgencySource(
  input: z.input<typeof sourceSchema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = sourceSchema.safeParse(input);
  if (!parsed.success) return invalid(t.errors.urlRequired);
  const v = parsed.data;
  if (v.kind === "google_sheet" && !v.url) return invalid(t.errors.urlRequired);
  const supabase = await createClient();
  const { data: activation } = await supabase
    .from("marketing_activations")
    .select("kind")
    .eq("id", v.activationId)
    .single();
  const kind = activation?.kind === "press" ? "press" : "influence";
  const { error } = await supabase.from("agency_sources").insert({
    activation_id: v.activationId,
    label: v.label,
    kind: v.kind,
    url: v.kind === "google_sheet" ? v.url : null,
    sheet_gid: v.kind === "google_sheet" ? textOrNull(v.sheetGid) : null,
    agency_contact_id: v.agencyContactId,
    agency_person: textOrNull(v.agencyPerson),
    key_fields: [...DEFAULT_KEY_FIELDS[kind]],
    organization_id: access.organizationId ?? "",
    project_id: v.projectId,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

const mappingSchema = z.object({
  projectId: z.uuid(),
  sourceId: z.uuid(),
  mapping: z.record(z.enum(ALL_FIELDS), z.string().max(200)),
  keyFields: z.array(z.enum(ALL_FIELDS)).min(1).max(4),
});

/** The columns' correspondence, confirmed by a person ; a new one never
 * erases the earlier reads (each snapshot keeps its raw rows). */
export async function saveAgencyMapping(
  input: z.input<typeof mappingSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = mappingSchema.safeParse(input);
  if (!parsed.success) return invalid(t.preview.errorsMessages.missingKey);
  const v = parsed.data;
  const mapping = Object.fromEntries(
    Object.entries(v.mapping).filter(([, h]) => h.trim() !== ""),
  );
  if (!v.keyFields.every((k) => mapping[k]))
    return invalid(t.preview.errorsMessages.missingKey);
  const supabase = await createClient();
  const { error } = await supabase
    .from("agency_sources")
    .update({ mapping, key_fields: v.keyFields })
    .eq("id", v.sourceId);
  return error ? activationFailure(error) : activationDone(v.projectId);
}

export type RefreshResult =
  | {
      ok: true;
      needsMapping?: { headers: string[]; proposal: Record<string, string> };
    }
  | { ok: false; error: string };

/**
 * « Actualiser » : the source read now (the Google Sheets export, or the file
 * just deposited), mapped, and recorded as a preview with its errors. A
 * missing or broken mapping stops here with the code's proposal.
 */
export async function refreshAgencySource(input: {
  projectId: string;
  sourceId: string;
  fileId: string | null;
}): Promise<RefreshResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      sourceId: z.uuid(),
      fileId: z.uuid().nullable(),
    })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const { projectId, sourceId, fileId } = parsed.data;
  const supabase = await createClient();
  const { data: source } = await supabase
    .from("agency_sources")
    .select(
      "id, kind, url, sheet_gid, label, mapping, key_fields, activation_id, marketing_activations(kind)",
    )
    .eq("id", sourceId)
    .single();
  if (!source) return invalid(fr.activations.errors.notFound);
  const read = await readSource(source, fileId);
  if (!read.ok) return read;
  if (read.table.rows.length === 0)
    return invalid(t.preview.errorsMessages.emptyFile);
  const kind =
    source.marketing_activations?.kind === "press" ? "press" : "influence";
  const mapping = (source.mapping ?? {}) as Record<string, string>;
  const mappedHeaders = Object.values(mapping);
  if (
    mappedHeaders.length === 0 ||
    mappedHeaders.some((h) => !read.table.headers.includes(h)) ||
    !source.key_fields.every((k) => mapping[k])
  )
    return {
      ok: true,
      needsMapping: {
        headers: read.table.headers,
        proposal: proposeMapping(read.table.headers, kind, mapping),
      },
    };
  const { rows, skipped } = mapRows(
    read.table,
    mapping,
    source.key_fields,
    t.preview.errorsMessages,
  );
  const fileErrors =
    skipped.length > 0 ? [t.preview.skipped(skipped.join(", "))] : [];
  const { error } = await supabase.rpc("record_agency_preview", {
    p_source_id: sourceId,
    p_file_id: fileId,
    p_headers: read.table.headers,
    p_rows: rows,
    p_errors: fileErrors,
  });
  return error ? activationFailure(error) : activationDone(projectId);
}

/** « Confirmer l'actualisation » : every change, or the ones kept. */
export async function applyAgencySnapshot(input: {
  projectId: string;
  snapshotId: string;
  keys: string[] | null;
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      snapshotId: z.uuid(),
      keys: z.array(z.string().max(300)).max(5000).nullable(),
    })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_agency_snapshot", {
    p_snapshot_id: parsed.data.snapshotId,
    p_keys: parsed.data.keys,
  });
  return error
    ? activationFailure(error)
    : activationDone(parsed.data.projectId);
}

export async function discardAgencySnapshot(input: {
  projectId: string;
  snapshotId: string;
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({ projectId: z.uuid(), snapshotId: z.uuid() })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createClient();
  const { error } = await supabase.rpc("discard_agency_snapshot", {
    p_snapshot_id: parsed.data.snapshotId,
  });
  return error
    ? activationFailure(error)
    : activationDone(parsed.data.projectId);
}
