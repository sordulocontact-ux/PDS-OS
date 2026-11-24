// The filters of the Dépenses page (BUD 3), read from the URL and offered
// from what the tab holds. Client-safe, pure code.

import type { UrlFilterGroup } from "@/components/ui/url-filters";
import type { Expense } from "@/lib/budget/expenses-queries";
import { BUDGET_FAMILIES } from "@/lib/budget/types";
import { budget } from "@/lib/i18n/fr/budget";
import { expenses } from "@/lib/i18n/fr/expenses";
import {
  filterValues,
  matchesAny,
  optionsOfNames,
} from "@/lib/ui/filter-options";

// Several values per axis (the « Filtres » panel): any of them.
export type ExpenseFilters = {
  artist: string[];
  project: string[];
  poste: string[];
  person: string[];
  // « AAAA-MM »
  mois: string[];
};

export function expenseFiltersOf(
  params: Record<string, string | string[] | undefined>,
): ExpenseFilters {
  return {
    artist: filterValues(params.artist),
    project: filterValues(params.project),
    poste: filterValues(params.poste),
    person: filterValues(params.person),
    mois: filterValues(params.mois),
  };
}

const projectOf = (e: Expense) =>
  e.target.kind === "project" ? e.targetLabel : null;
const monthOf = (e: Expense) => e.spentOn.slice(0, 7);

export function matchesExpense(e: Expense, f: ExpenseFilters): boolean {
  return (
    matchesAny(f.artist, e.artistName) &&
    matchesAny(f.project, projectOf(e)) &&
    matchesAny(f.poste, e.family) &&
    matchesAny(f.person, e.authorName) &&
    matchesAny(f.mois, monthOf(e))
  );
}

const monthLabel = (month: string) => {
  const [year, m] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, m - 1, 15)));
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Only what some spend of the tab holds; the newest month first. */
export function expenseFilterGroups(
  rows: Expense[],
  current: ExpenseFilters,
): UrlFilterGroup[] {
  const t = expenses.filters;
  const months = [...new Set(rows.map(monthOf))].sort().reverse();
  return [
    {
      key: "artist",
      label: t.artist,
      allLabel: t.artistAll,
      options: optionsOfNames(rows.map((e) => e.artistName)),
      current: current.artist,
    },
    {
      key: "project",
      label: t.project,
      allLabel: t.projectAll,
      options: optionsOfNames(rows.map(projectOf)),
      current: current.project,
    },
    {
      key: "poste",
      label: t.family,
      allLabel: t.familyAll,
      options: BUDGET_FAMILIES.filter((f) =>
        rows.some((e) => e.family === f),
      ).map((f) => ({ value: f, label: budget.families[f] })),
      current: current.poste,
    },
    {
      key: "person",
      label: t.person,
      allLabel: t.personAll,
      options: optionsOfNames(rows.map((e) => e.authorName)),
      current: current.person,
    },
    {
      key: "mois",
      label: t.month,
      allLabel: t.monthAll,
      options: months.map((m) => ({ value: m, label: monthLabel(m) })),
      current: current.mois,
    },
  ];
}
