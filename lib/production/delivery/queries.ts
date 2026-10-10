import "server-only";

import type { Member } from "@/lib/framing/related";
import {
  isExportCheckKind,
  type ExportCheckLine,
} from "@/lib/production/delivery/rules";
import { listProductionFiles } from "@/lib/production/files/queries";
import { createClient } from "@/lib/supabase/server";

export type DeliveryRecord = {
  versionId: string | null;
  finalUrl: string | null;
  finalNote: string | null;
  finalSetAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  checkedAt: string | null;
  checkedBy: string | null;
  deliveredAt: string | null;
  deliveredBy: string | null;
};

export type HandoffRecord = {
  id: string;
  versionId: string | null;
  versionNumber: number | null;
  finalUrl: string | null;
  deliveredAt: string;
  formats: string[];
  constraints: string | null;
  confirmedBy: string | null;
  confirmedAt: string;
};

export type DeliveryTabData = {
  delivery: DeliveryRecord | null;
  // The validated version the delivery rests on (the creative decision).
  version: { id: string; number: number; href: string | null } | null;
  lines: ExportCheckLine[];
  // Newest first.
  handoffs: HandoffRecord[];
};

const resultOf = (value: string | null): ExportCheckLine["result"] =>
  value === "ok" || value === "not_ok" ? value : null;

/** One sheet's delivery, checklist and transmissions, read with the user's
 * session. Names come from the members already loaded with the sheet. */
export async function loadDeliveryTab(
  sheetId: string,
  deliverableId: string,
  members: Member[],
): Promise<DeliveryTabData> {
  const supabase = await createClient();
  const [deliveryRes, versionsRes, linesRes, handoffsRes] = await Promise.all([
    supabase
      .from("deliverable_deliveries")
      .select(
        "version_id, final_url, final_note, final_set_at, approved_at, approved_by, checked_at, checked_by, delivered_at, delivered_by",
      )
      .eq("deliverable_id", deliverableId)
      .maybeSingle(),
    supabase
      .from("production_versions")
      .select("id, number, status, url, file_id")
      .eq("sheet_id", sheetId)
      .order("number", { ascending: false }),
    supabase
      .from("production_export_checks")
      .select("id, label, kind, url, result, checked_by, checked_at, note")
      .eq("sheet_id", sheetId)
      .order("position")
      .order("created_at"),
    supabase
      .from("production_activation_handoffs")
      .select(
        "id, version_id, final_url, delivered_at, formats, constraints_note, confirmed_by, confirmed_at",
      )
      .eq("sheet_id", sheetId)
      .order("confirmed_at", { ascending: false }),
  ]);
  for (const res of [deliveryRes, versionsRes, linesRes, handoffsRes])
    if (res.error) console.error("loadDeliveryTab:", res.error.message);

  const nameOf = (personId: string | null) =>
    personId
      ? (members.find((m) => m.personId === personId)?.name ?? "—")
      : null;
  const row = deliveryRes.data;
  const versions = versionsRes.data ?? [];
  const numberOf = (id: string | null) =>
    id ? (versions.find((v) => v.id === id)?.number ?? null) : null;

  // The version recorded by the creative decision, else the latest approved.
  const validated =
    (row?.version_id ? versions.find((v) => v.id === row.version_id) : null) ??
    versions.find((v) => v.status === "approved") ??
    null;
  let href = validated?.url ?? null;
  if (validated?.file_id) {
    const files = await listProductionFiles(supabase, sheetId, ["version"]);
    href = files.find((f) => f.id === validated.file_id)?.href ?? null;
  }

  return {
    delivery: row
      ? {
          versionId: row.version_id,
          finalUrl: row.final_url,
          finalNote: row.final_note,
          finalSetAt: row.final_set_at,
          approvedAt: row.approved_at,
          approvedBy: nameOf(row.approved_by),
          checkedAt: row.checked_at,
          checkedBy: nameOf(row.checked_by),
          deliveredAt: row.delivered_at,
          deliveredBy: nameOf(row.delivered_by),
        }
      : null,
    version: validated
      ? { id: validated.id, number: validated.number, href }
      : null,
    lines: (linesRes.data ?? []).map((l) => ({
      id: l.id,
      label: l.label,
      kind: isExportCheckKind(l.kind) ? l.kind : "other",
      url: l.url,
      result: resultOf(l.result),
      checkedBy: nameOf(l.checked_by),
      checkedAt: l.checked_at,
      note: l.note,
    })),
    handoffs: (handoffsRes.data ?? []).map((h) => ({
      id: h.id,
      versionId: h.version_id,
      versionNumber: numberOf(h.version_id),
      finalUrl: h.final_url,
      deliveredAt: h.delivered_at,
      formats: h.formats,
      constraints: h.constraints_note,
      confirmedBy: nameOf(h.confirmed_by),
      confirmedAt: h.confirmed_at,
    })),
  };
}
