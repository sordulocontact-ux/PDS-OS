// The views and filters of the Deals page (BIZ 4), read from the URL and
// offered from what the tab holds. Client-safe, pure code.

import type { UrlFilterGroup } from "@/components/ui/url-filters";
import { isClosedStage, type Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { filterParam, optionsOfNames } from "@/lib/ui/filter-options";

/** One list, four views (never three lists Opportunités / Négociations /
 * Accords): the open deals, the ones to follow up, signed, abandoned. */
export const DEAL_VIEWS = ["open", "follow-up", "signed", "abandoned"] as const;
export type DealView = (typeof DEAL_VIEWS)[number];

export const dealViewOf = (value: unknown): DealView =>
  (DEAL_VIEWS as readonly unknown[]).includes(value)
    ? (value as DealView)
    : "open";

/** A follow-up whose date has come, on an open deal. */
export const followUpDue = (deal: Deal, today: string) =>
  !isClosedStage(deal.stage) &&
  deal.followUpOn !== null &&
  deal.followUpOn <= today;

export function inDealView(deal: Deal, view: DealView, today: string) {
  if (view === "signed") return deal.stage === "signed";
  if (view === "abandoned") return deal.stage === "abandoned";
  if (view === "follow-up") return followUpDue(deal, today);
  return !isClosedStage(deal.stage);
}

export type DealFilters = {
  etape: string | null;
  negociateur: string | null;
  projet: string | null;
};

export function dealFiltersOf(
  params: Record<string, string | string[] | undefined>,
): DealFilters {
  return {
    etape: filterParam(params.etape),
    negociateur: filterParam(params.negociateur),
    projet: filterParam(params.projet),
  };
}

export const matchesDeal = (d: Deal, f: DealFilters) =>
  (!f.etape || d.stage === f.etape) &&
  (!f.negociateur || d.assignee?.name === f.negociateur) &&
  (!f.projet || d.projectTitle === f.projet);

/** Only what some deal of the tab holds. */
export function dealFilterGroups(
  rows: Deal[],
  current: DealFilters,
): UrlFilterGroup[] {
  const t = deals.filters;
  const stages = [...new Set(rows.map((d) => d.stage))];
  return [
    {
      key: "etape",
      label: t.stage,
      allLabel: t.stageAll,
      options: stages.map((s) => ({ value: s, label: deals.stages[s] })),
      current: current.etape,
    },
    {
      key: "negociateur",
      label: t.assignee,
      allLabel: t.assigneeAll,
      options: optionsOfNames(rows.map((d) => d.assignee?.name ?? null)),
      current: current.negociateur,
    },
    {
      key: "projet",
      label: t.project,
      allLabel: t.projectAll,
      options: optionsOfNames(rows.map((d) => d.projectTitle)),
      current: current.projet,
    },
  ];
}
