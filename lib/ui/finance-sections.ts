// The sections of Finance (Ibé's ticket « Cockpit Finance »: its side
// menu), grouped for the second sidebar (Sacha 13/11/2026: « double
// sidebar comme le projet »). Client-safe.
import { routes } from "@/lib/auth/redirects";
import { treasury } from "@/lib/i18n/fr/treasury";

const t = treasury.tabs;

export const FINANCE_GROUPS = ["steer", "spend", "earn", "bank"] as const;
export type FinanceGroup = (typeof FINANCE_GROUPS)[number];

export const FINANCE_SECTIONS = [
  {
    key: "overview",
    label: t.overview,
    href: routes.finance,
    group: "steer",
    exact: true,
  },
  {
    key: "treasury",
    label: t.treasury,
    href: routes.financeTreasury,
    group: "steer",
  },
  {
    key: "alerts",
    label: t.alerts,
    href: routes.financeAlerts,
    group: "steer",
  },
  {
    key: "budgets",
    label: t.budgets,
    href: routes.financeBudgets,
    group: "spend",
  },
  {
    key: "spends",
    label: t.expenses,
    href: routes.financeSpends,
    group: "spend",
  },
  {
    key: "incomes",
    label: t.incomes,
    href: routes.financeIncomes,
    group: "earn",
  },
  {
    key: "fundings",
    label: t.fundings,
    href: routes.financeFundings,
    group: "earn",
  },
  {
    key: "reconcile",
    label: t.reconcile,
    href: routes.financeReconcile,
    group: "bank",
  },
  {
    key: "exports",
    label: t.exports,
    href: routes.financeExports,
    group: "bank",
  },
] as const satisfies readonly {
  key: string;
  label: string;
  href: string;
  group: FinanceGroup;
  exact?: boolean;
}[];

export type FinanceSection = (typeof FINANCE_SECTIONS)[number]["key"];

export const financeSectionActive = (
  section: (typeof FINANCE_SECTIONS)[number],
  pathname: string,
) =>
  "exact" in section && section.exact
    ? pathname === section.href
    : pathname === section.href || pathname.startsWith(`${section.href}/`);
