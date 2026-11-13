import "server-only";

import { isBudgetFamily, isBudgetStatus } from "@/lib/budget/types";
import { addMonths, type FinancePeriod } from "@/lib/finance/period";
import type {
  FinanceData,
  FinanceLine,
  FinanceMonthTotal,
} from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// How many of the largest spends the page names.
export const LARGEST_COUNT = 5;

type LineRow = {
  line_id: string;
  label: string;
  amount_cents: number;
  family: string | null;
  status: string;
  spent_on: string;
  project_id: string | null;
  artist_id: string | null;
  due_on: string | null;
  contact_name: string | null;
};

const toLine = (r: LineRow): FinanceLine => ({
  id: r.line_id,
  label: r.label,
  cents: Number(r.amount_cents),
  family: isBudgetFamily(r.family) ? r.family : null,
  status: isBudgetStatus(r.status) ? r.status : "planned",
  spentOn: r.spent_on,
  projectId: r.project_id,
  artistId: r.artist_id,
  dueOn: r.due_on,
  contactName: r.contact_name,
});

async function lines(
  supabase: Supabase,
  kind: "to_pay" | "largest",
  period: FinancePeriod | null,
) {
  const { data, error } = await supabase.rpc("finance_lines", {
    p_kind: kind,
    p_limit: kind === "to_pay" ? 200 : LARGEST_COUNT,
    ...(period?.from ? { p_from: `${period.from}-01` } : {}),
    // The day before the first of the month after.
    ...(period?.to
      ? {
          p_to: new Date(
            Date.parse(`${addMonths(period.to, 1)}-01T00:00:00Z`) - 86400000,
          )
            .toISOString()
            .slice(0, 10),
        }
      : {}),
  });
  if (error) console.error(`loadFinance (${kind}):`, error.message);
  return { rows: (data ?? []).map(toLine), error: Boolean(error) };
}

/**
 * Everything the Finance page shows, in one round of reads: the spending
 * summed by month, the projects and artists that spend, « À payer » and the
 * largest spends of the period. Read with the user's session through the
 * finance_* functions, which return nothing without read_finance
 * (supabase/migrations/20261112150101_finance.sql).
 */
export async function loadFinance(period: FinancePeriod): Promise<FinanceData> {
  const supabase = await createClient();
  const [months, projects, artists, toPay, largest] = await Promise.all([
    supabase.rpc("finance_month_totals"),
    supabase.rpc("finance_projects"),
    supabase.rpc("finance_artists"),
    lines(supabase, "to_pay", null),
    lines(supabase, "largest", period),
  ]);
  for (const [name, result] of [
    ["months", months],
    ["projects", projects],
    ["artists", artists],
  ] as const)
    if (result.error)
      console.error(`loadFinance (${name}):`, result.error.message);

  return {
    months: (months.data ?? []).flatMap((r): FinanceMonthTotal[] =>
      isBudgetStatus(r.status)
        ? [
            {
              month: r.month.slice(0, 7),
              projectId: r.project_id,
              artistId: r.artist_id,
              family: isBudgetFamily(r.family) ? r.family : null,
              status: r.status,
              cents: Number(r.total_cents),
              lines: r.line_count,
              noProof: r.no_proof_count,
            },
          ]
        : [],
    ),
    projects: (projects.data ?? []).map((r) => ({
      id: r.project_id,
      title: r.title,
      artistId: r.artist_id,
      collective: r.collective,
      archived: r.archived,
      envelopeCents: r.budget_cents === null ? null : Number(r.budget_cents),
    })),
    artists: (artists.data ?? []).map((r) => ({
      id: r.artist_id,
      name: r.name,
      archived: r.archived,
      envelope:
        r.budget_id === null
          ? null
          : {
              cents: Number(r.budget_cents),
              startsOn: r.starts_on,
              endsOn: r.ends_on,
              spentCents: Number(r.spent_cents ?? 0),
              pendingCents: Number(r.pending_cents ?? 0),
            },
    })),
    toPay: toPay.rows,
    largest: largest.rows,
    error:
      Boolean(months.error || projects.error || artists.error) ||
      toPay.error ||
      largest.error,
  };
}
