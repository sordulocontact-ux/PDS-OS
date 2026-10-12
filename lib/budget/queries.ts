import "server-only";

import { FILE_BUCKETS, withDownloadName } from "@/lib/catalog/file-rules";
import {
  isBudgetFamily,
  isBudgetStatus,
  type BudgetDeliverable,
  type BudgetLever,
  type BudgetLine,
} from "@/lib/budget/types";
import { createClient } from "@/lib/supabase/server";

export type BudgetData = {
  error: boolean;
  lines: BudgetLine[];
  // Selected levers of the project, the ones a spend can serve.
  levers: BudgetLever[];
  // Its deliverables, the ones a spend can pay for (MKT-S1-12).
  deliverables: BudgetDeliverable[];
};

/** The budget lines of a project, read with the user's session (RLS). */
export async function loadBudget(projectId: string): Promise<BudgetData> {
  const supabase = await createClient();
  const [linesRes, leversRes, deliverablesRes] = await Promise.all([
    supabase
      .from("budget_lines")
      .select(
        "id, label, amount_cents, status, family, family_detail, lever_id, deliverable_id, note, lever:levers!budget_lines_lever_same_org(label), deliverable:strategy_deliverables!budget_lines_deliverable_id_fkey(title), attachment:project_files!budget_lines_attachment_file_id_fkey(id, file_name, path)",
      )
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("levers")
      .select("id, label")
      .eq("project_id", projectId)
      .eq("state", "selected")
      .eq("review_status", "confirmed")
      .order("created_at"),
    supabase
      .from("strategy_deliverables")
      .select("id, title, lever_id")
      .eq("project_id", projectId)
      .order("created_at"),
  ]);

  if (linesRes.error) console.error("loadBudget:", linesRes.error.message);
  const rows = linesRes.data ?? [];
  const paths = rows.flatMap((r) => (r.attachment ? [r.attachment.path] : []));
  const signed = paths.length
    ? await supabase.storage
        .from(FILE_BUCKETS.project)
        .createSignedUrls(paths, 3600)
    : null;
  const urlOf = new Map(
    (signed?.data ?? []).flatMap((e) =>
      e.path && e.signedUrl ? [[e.path, e.signedUrl]] : [],
    ),
  );
  const lines = rows.map((row): BudgetLine => {
    const url = row.attachment
      ? (urlOf.get(row.attachment.path) ?? null)
      : null;
    return {
      id: row.id,
      label: row.label,
      amountCents: row.amount_cents,
      status: isBudgetStatus(row.status) ? row.status : "planned",
      family: isBudgetFamily(row.family) ? row.family : null,
      familyDetail: row.family_detail,
      leverId: row.lever_id,
      leverLabel: row.lever?.label ?? null,
      deliverableId: row.deliverable_id,
      deliverableTitle: row.deliverable?.title ?? null,
      attachment: row.attachment
        ? {
            id: row.attachment.id,
            name: row.attachment.file_name,
            url: url && withDownloadName(url, row.attachment.file_name),
          }
        : null,
      note: row.note,
    };
  });
  return {
    error: Boolean(linesRes.error),
    lines,
    levers: leversRes.data ?? [],
    deliverables: (deliverablesRes.data ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      leverId: d.lever_id,
    })),
  };
}
