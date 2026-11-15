// The sections of Finance (Ibé's ticket « Cockpit Finance »: its side
// menu), grouped for the second sidebar (Sacha 13/11/2026: « double
// sidebar comme le projet »). Client-safe.
import {
  IconChartBarTrendUp,
  IconCreditCard,
  IconFile,
  IconMoneyBillCoin,
  IconPaperPlane2,
  IconPaperclip,
  IconPiggyBank,
  IconSquareActivityChart,
  IconTriangleWarning,
  IconVault3,
} from "nucleo-sharp-essential";
import type { ComponentType } from "react";

import { routes } from "@/lib/auth/redirects";
import { treasury } from "@/lib/i18n/fr/treasury";

const t = treasury.tabs;

export const FINANCE_GROUPS = ["steer", "spend", "earn", "bank"] as const;
export type FinanceGroup = (typeof FINANCE_GROUPS)[number];

export const FINANCE_SECTIONS = [
  // A flat list with icons, in the order of a day's work (new style after
  // Midday, Sacha 15/11/2026, docs/FINANCE-V2.md): see, act, then the bank.
  {
    key: "overview",
    label: t.overview,
    href: routes.finance,
    group: "steer",
    icon: IconSquareActivityChart,
    exact: true,
  },
  {
    key: "treasury",
    label: t.treasury,
    href: routes.financeTreasury,
    group: "steer",
    icon: IconChartBarTrendUp,
  },
  {
    key: "reconcile",
    label: t.reconcile,
    href: routes.financeReconcile,
    group: "bank",
    icon: IconCreditCard,
  },
  {
    // The box of proofs (lot 6): tickets and invoices, read, attached.
    key: "receipts",
    label: t.receipts,
    href: routes.financeReceipts,
    group: "spend",
    icon: IconPaperclip,
  },
  {
    key: "spends",
    label: t.expenses,
    href: routes.financeSpends,
    group: "spend",
    icon: IconMoneyBillCoin,
  },
  {
    key: "budgets",
    label: t.budgets,
    href: routes.financeBudgets,
    group: "spend",
    icon: IconPiggyBank,
  },
  {
    key: "incomes",
    label: t.incomes,
    href: routes.financeIncomes,
    group: "earn",
    icon: IconFile,
  },
  {
    key: "fundings",
    label: t.fundings,
    href: routes.financeFundings,
    group: "earn",
    icon: IconVault3,
  },
  {
    key: "alerts",
    label: t.alerts,
    href: routes.financeAlerts,
    group: "steer",
    icon: IconTriangleWarning,
  },
  {
    key: "exports",
    label: t.exports,
    href: routes.financeExports,
    group: "bank",
    icon: IconPaperPlane2,
  },
] as const satisfies readonly {
  key: string;
  label: string;
  href: string;
  group: FinanceGroup;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
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
