// What the Finance page shows, computed from what it read (lib/finance/
// queries.ts) for one period and one reader. Client-safe, pure code.

import { routes } from "@/lib/auth/redirects";
import type { RankedBar } from "@/components/ui/ranked-bars";
import type { EnvelopeTableRow } from "@/components/finance/envelope-table";
import {
  artistBudgets,
  artistShares,
  changePercent,
  familyShares,
  monthBars,
  ofPeriod,
  overruns,
  projectBudgets,
  spendSums,
  type MonthBar,
  type Share,
  type SpendSums,
} from "@/lib/finance/aggregate";
import { chartMonths, type FinancePeriod } from "@/lib/finance/period";
import type { FinanceData, FinanceLine } from "@/lib/finance/types";
import { budget } from "@/lib/i18n/fr/budget";
import { finance } from "@/lib/i18n/fr/finance";
import { formatAmount } from "@/lib/utils/money";

const fr = { budget, finance };

/** Which pages the reader may open from Finance: a project's Budget (its
 * budget's readers: the direction), an artist's (the artists' budgets'
 * readers), Dépenses. Finance itself shows totals to whoever reads it. */
export type FinanceLinks = { projects: boolean; artists: boolean };

export type FinanceView = {
  sums: SpendSums;
  change: number | null;
  toPayCents: number;
  lateCount: number;
  bars: MonthBar[];
  families: RankedBar[];
  artists: RankedBar[];
  projectRows: EnvelopeTableRow[];
  artistRows: EnvelopeTableRow[];
  overruns: { projects: number; artists: number };
  targetOf: (line: FinanceLine) => string | null;
  hrefOf: (line: FinanceLine) => string | null;
};

function ranked<K>(
  shares: Share<K>[],
  keyOf: (key: K) => string,
  labelOf: (key: K) => string,
): RankedBar[] {
  return shares.map((s) => ({
    key: keyOf(s.key),
    label: labelOf(s.key),
    value: s.engagedCents,
    display: formatAmount(s.engagedCents, { ht: false }),
    hint:
      s.estimatedCents > 0
        ? fr.finance.budget.estimated(
            formatAmount(s.estimatedCents, { ht: false }),
          )
        : undefined,
  }));
}

export function financeView(
  data: FinanceData,
  period: FinancePeriod,
  today: string,
  links: FinanceLinks,
): FinanceView {
  const t = fr.finance;
  const current = ofPeriod(data.months, period);
  const sums = spendSums(current);
  const previous = period.previous
    ? spendSums(ofPeriod(data.months, period.previous))
    : null;
  const projectName = new Map(data.projects.map((p) => [p.id, p]));
  const artistName = new Map(data.artists.map((a) => [a.id, a.name]));
  const projectHref = (id: string) =>
    links.projects ? routes.projectBudget(id) : null;
  const artistHref = (id: string) =>
    links.artists ? routes.artistBudget(id) : null;

  const projects = projectBudgets(data.months, data.projects);
  const artists = artistBudgets(data.artists);

  return {
    sums,
    change: previous
      ? changePercent(sums.engagedCents, previous.engagedCents)
      : null,
    // Every invoice not paid yet, whatever the period.
    toPayCents: spendSums(data.months).invoicedCents,
    lateCount: data.toPay.filter((l) => l.dueOn !== null && l.dueOn < today)
      .length,
    bars: monthBars(
      data.months,
      chartMonths(
        period,
        today,
        data.months.map((m) => m.month),
      ),
    ),
    families: ranked(
      familyShares(current),
      (f) => f ?? "none",
      (f) => (f ? fr.budget.families[f] : t.byFamily.none),
    ),
    artists: ranked(
      artistShares(current, data.projects),
      (a) => a ?? "none",
      (a) => (a ? (artistName.get(a) ?? t.byArtist.none) : t.byArtist.none),
    ),
    projectRows: projects.map((row) => {
      const project = projectName.get(row.id);
      return {
        ...row,
        title: project?.title ?? "",
        subtitle: project?.collective
          ? t.projects.collective
          : project?.artistId
            ? artistName.get(project.artistId)
            : undefined,
        href: projectHref(row.id),
      };
    }),
    artistRows: artists.map((row) => ({
      ...row,
      title: artistName.get(row.id) ?? "",
      href: artistHref(row.id),
    })),
    overruns: { projects: overruns(projects), artists: overruns(artists) },
    targetOf: (line) =>
      line.projectId
        ? (projectName.get(line.projectId)?.title ?? null)
        : line.artistId
          ? (artistName.get(line.artistId) ?? null)
          : null,
    hrefOf: (line) =>
      line.projectId
        ? projectHref(line.projectId)
        : line.artistId
          ? artistHref(line.artistId)
          : null,
  };
}
