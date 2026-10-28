import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { createClient } from "@/lib/supabase/server";

export type AgencySourceRecord = {
  id: string;
  label: string;
  kind: "google_sheet" | "file" | "manual";
  url: string | null;
  sheetGid: string | null;
  agencyContactId: string | null;
  agencyPerson: string | null;
  mapping: Record<string, string>;
  keyFields: string[];
  lastSnapshot: {
    id: string;
    status: string;
    takenAt: string;
    headers: string[];
  } | null;
};

export type SnapshotRowRecord = {
  rowKey: string;
  position: number | null;
  raw: Record<string, string> | null;
  mapped: Record<string, string | number> | null;
  errors: string[];
  change: "added" | "modified" | "unchanged" | "absent";
};

export type AgencyRowRecord = {
  id: string;
  sourceId: string;
  rowKey: string;
  contactId: string | null;
  current: Record<string, string | number>;
  agencyStatus: string | null;
  absentSince: string | null;
  pdsDecision: string;
  pdsNote: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  updatedAt: string;
};

export type AgencyReportRecord = {
  id: string;
  fileId: string | null;
  url: string | null;
  body: string | null;
  receivedOn: string;
  status: string;
  reserves: { key: string; count?: number; label?: string }[] | null;
  comment: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdBy: string | null;
};

const asRecord = <T>(v: unknown, fallback: T): T =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as T) : fallback;

/** An agency activation's sources (with their last read), the preview
 * waiting for confirmation, the agency rows and the reports. */
export const loadAgency = trackedCache(async (activationId: string) => {
  const supabase = await createClient();
  const [sources, snapshots, rows, reports] = await Promise.all([
    supabase
      .from("agency_sources")
      .select("*")
      .eq("activation_id", activationId)
      .order("created_at"),
    supabase
      .from("agency_snapshots")
      .select("id, source_id, status, taken_at, headers, errors")
      .eq("activation_id", activationId)
      .order("taken_at", { ascending: false }),
    supabase
      .from("agency_rows")
      .select("*")
      .eq("activation_id", activationId)
      .order("created_at"),
    supabase
      .from("agency_reports")
      .select("*")
      .eq("activation_id", activationId)
      .order("received_on"),
  ]);
  const failed = [sources, snapshots, rows, reports]
    .map((r) => r.error)
    .find(Boolean);
  if (failed) throw new Error(`loadAgency: ${failed.message}`);
  const preview = snapshots.data?.find((s) => s.status === "preview") ?? null;
  const previewRows = preview
    ? ((
        await supabase
          .from("agency_snapshot_rows")
          .select("row_key, position, raw, mapped, errors, change")
          .eq("snapshot_id", preview.id)
          .order("position")
      ).data ?? [])
    : [];

  return {
    sources: (sources.data ?? []).map<AgencySourceRecord>((s) => {
      const last = snapshots.data?.find(
        (x) => x.source_id === s.id && x.status !== "discarded",
      );
      return {
        id: s.id,
        label: s.label,
        kind: s.kind as AgencySourceRecord["kind"],
        url: s.url,
        sheetGid: s.sheet_gid,
        agencyContactId: s.agency_contact_id,
        agencyPerson: s.agency_person,
        mapping: asRecord(s.mapping, {}),
        keyFields: s.key_fields,
        lastSnapshot: last
          ? {
              id: last.id,
              status: last.status,
              takenAt: last.taken_at,
              headers: last.headers,
            }
          : null,
      };
    }),
    preview: preview
      ? {
          id: preview.id,
          sourceId: preview.source_id,
          takenAt: preview.taken_at,
          errors: Array.isArray(preview.errors)
            ? (preview.errors as string[])
            : [],
          rows: previewRows.map<SnapshotRowRecord>((r) => ({
            rowKey: r.row_key,
            position: r.position,
            raw: asRecord(r.raw, null),
            mapped: asRecord(r.mapped, null),
            errors: Array.isArray(r.errors) ? (r.errors as string[]) : [],
            change: r.change as SnapshotRowRecord["change"],
          })),
        }
      : null,
    rows: (rows.data ?? []).map<AgencyRowRecord>((r) => ({
      id: r.id,
      sourceId: r.source_id,
      rowKey: r.row_key,
      contactId: r.contact_id,
      current: asRecord(r.current, {}),
      agencyStatus: r.agency_status,
      absentSince: r.absent_since,
      pdsDecision: r.pds_decision,
      pdsNote: r.pds_note,
      decidedBy: r.decided_by,
      decidedAt: r.decided_at,
      updatedAt: r.updated_at,
    })),
    reports: (reports.data ?? []).map<AgencyReportRecord>((r) => ({
      id: r.id,
      fileId: r.file_id,
      url: r.url,
      body: r.body,
      receivedOn: r.received_on,
      status: r.status,
      reserves: Array.isArray(r.reserves)
        ? (r.reserves as AgencyReportRecord["reserves"])
        : null,
      comment: r.comment,
      decidedBy: r.decided_by,
      decidedAt: r.decided_at,
      createdBy: r.created_by,
    })),
  };
});

export type AgencyData = Awaited<ReturnType<typeof loadAgency>>;
