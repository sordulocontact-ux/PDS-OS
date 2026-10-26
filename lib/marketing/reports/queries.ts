import "server-only";

import type { Access } from "@/lib/auth/access";
import { loadMembers } from "@/lib/framing/related";
import {
  isReportSection,
  isReportState,
  parseSnapshot,
  type ReportBudget,
  type ReportSnapshot,
  type ReportVersion,
} from "@/lib/marketing/reports/model";
import { createClient } from "@/lib/supabase/server";

const COLUMNS =
  "id, version, state, period_start, period_end, activation_ids, sections, rules_version, content_hash, created_at, created_by, submitted_at, submitted_by";

type Row = {
  id: string;
  version: number;
  state: string;
  period_start: string | null;
  period_end: string | null;
  activation_ids: string[];
  sections: string[];
  rules_version: number;
  content_hash: string;
  created_at: string;
  created_by: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
};

function toVersion(
  row: Row,
  members: { personId: string; name: string }[],
): ReportVersion | null {
  if (!isReportState(row.state)) return null;
  return {
    id: row.id,
    version: row.version,
    state: row.state,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    activationIds: row.activation_ids,
    sections: row.sections.filter(isReportSection),
    rulesVersion: row.rules_version,
    contentHash: row.content_hash,
    createdAt: row.created_at,
    authorPersonId: row.created_by,
    authorName:
      members.find((m) => m.personId === row.created_by)?.name ?? null,
    submittedAt: row.submitted_at,
    submitterPersonId: row.submitted_by,
    submitterName:
      members.find((m) => m.personId === row.submitted_by)?.name ?? null,
  };
}

/** Every version of the project's report, newest first (RLS decides). */
export async function listReports(
  projectId: string,
  access: Access,
): Promise<ReportVersion[]> {
  const supabase = await createClient();
  const [{ data }, members] = await Promise.all([
    supabase
      .from("marketing_reports")
      .select(COLUMNS)
      .eq("project_id", projectId)
      .order("version", { ascending: false }),
    loadMembers(access),
  ]);
  return (data ?? []).flatMap((row) => toVersion(row, members) ?? []);
}

export type ReportDetail = ReportVersion & {
  snapshot: ReportSnapshot;
  // Null: not asked for, or the viewer may not read the budget.
  budget: ReportBudget | null;
};

/** One version with its snapshot, as it was generated. */
export async function loadReport(
  projectId: string,
  reportId: string,
  access: Access,
): Promise<ReportDetail | null> {
  const supabase = await createClient();
  const [{ data }, { data: budget }, members] = await Promise.all([
    supabase
      .from("marketing_reports")
      .select(`${COLUMNS}, snapshot`)
      .eq("project_id", projectId)
      .eq("id", reportId)
      .maybeSingle(),
    supabase
      .from("marketing_report_budgets")
      .select("planned_cents, committed_cents, invoiced_cents, paid_cents")
      .eq("report_id", reportId)
      .maybeSingle(),
    loadMembers(access),
  ]);
  if (!data) return null;
  const version = toVersion(data, members);
  if (!version) return null;
  return {
    ...version,
    snapshot: parseSnapshot(data.snapshot),
    budget: budget
      ? {
          plannedCents: budget.planned_cents,
          committedCents: budget.committed_cents,
          invoicedCents: budget.invoiced_cents,
          paidCents: budget.paid_cents,
        }
      : null,
  };
}
