import "server-only";

import { FILE_BUCKETS, withDownloadName } from "@/lib/catalog/file-rules";
import {
  isBudgetFamily,
  isBudgetStatus,
  type BudgetLine,
} from "@/lib/budget/types";
import { createClient } from "@/lib/supabase/server";
import { personName } from "@/lib/projects/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// One reading of a spend for every page that shows it (a project's Budget,
// an artist's, Dépenses): the same columns, the same mapping, the proofs of
// both libraries signed for an hour. Read with the user's session (RLS).
const LINE_SELECT =
  "id, project_id, artist_id, label, amount_cents, status, family, family_detail, spent_on, lever_id, deliverable_id, note, invoice_id, committed_cents, lever:levers!budget_lines_lever_same_org(label), deliverable:strategy_deliverables!budget_lines_deliverable_id_fkey(title), attachment:project_files!budget_lines_attachment_file_id_fkey(id, file_name, path), receipt:artist_files!budget_lines_artist_attachment_file_id_fkey(id, file_name, path), project:projects!budget_lines_project_same_org(title), artist:artists!budget_lines_artist_same_org(name), author:people!budget_lines_created_by_fkey(first_name, last_name)";

export function selectBudgetLines(supabase: Supabase) {
  return supabase.from("budget_lines").select(LINE_SELECT);
}

type LineRow = NonNullable<
  Awaited<ReturnType<typeof selectBudgetLines>>["data"]
>[number];

async function signed(
  supabase: Supabase,
  bucket: string,
  paths: string[],
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, 3600);
  return new Map(
    (data ?? []).flatMap((e) =>
      e.path && e.signedUrl ? [[e.path, e.signedUrl]] : [],
    ),
  );
}

/** The rows as the pages show them, each proof with its signed link. */
export async function toBudgetLines(
  supabase: Supabase,
  rows: LineRow[],
): Promise<BudgetLine[]> {
  const [projectUrls, artistUrls] = await Promise.all([
    signed(
      supabase,
      FILE_BUCKETS.project,
      rows.flatMap((r) => (r.attachment ? [r.attachment.path] : [])),
    ),
    signed(
      supabase,
      FILE_BUCKETS.artist,
      rows.flatMap((r) => (r.receipt ? [r.receipt.path] : [])),
    ),
  ]);
  return rows.map((row): BudgetLine => {
    const file = row.attachment ?? row.receipt;
    const url = file
      ? ((row.attachment ? projectUrls : artistUrls).get(file.path) ?? null)
      : null;
    return {
      id: row.id,
      target: row.artist_id
        ? { kind: "artist", id: row.artist_id }
        : { kind: "project", id: row.project_id ?? "" },
      targetLabel: row.artist?.name ?? row.project?.title ?? null,
      label: row.label,
      spentOn: row.spent_on,
      authorName: row.author
        ? personName(row.author.first_name, row.author.last_name)
        : null,
      amountCents: row.amount_cents,
      status: isBudgetStatus(row.status) ? row.status : "planned",
      family: isBudgetFamily(row.family) ? row.family : null,
      familyDetail: row.family_detail,
      leverId: row.lever_id,
      leverLabel: row.lever?.label ?? null,
      deliverableId: row.deliverable_id,
      deliverableTitle: row.deliverable?.title ?? null,
      attachment: file
        ? {
            id: file.id,
            name: file.file_name,
            url: url && withDownloadName(url, file.file_name),
          }
        : null,
      note: row.note,
      invoiceId: row.invoice_id,
      committedCents: row.committed_cents,
    };
  });
}
