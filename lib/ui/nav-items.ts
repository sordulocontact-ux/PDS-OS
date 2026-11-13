import {
  IconCalendarDays,
  IconChartBarTrendUp,
  IconFile,
  IconFolderOpen,
  IconHandshake,
  IconHouse2,
  IconMicrophone,
  IconMoneyBillCoin,
  IconMsgs,
  IconNodes,
  IconPhone,
  IconScale,
  IconSliders,
  IconSparkle3,
  IconUserSearch,
  IconUsers2,
} from "nucleo-sharp-essential";

import { IconBriefcase, IconDisc } from "@/components/icons";
import { routes, type Permission } from "@/lib/auth/redirects";
import { shell } from "@/lib/i18n/fr/shell";

const fr = { shell };

// The 8 items of the main sidebar (Figma "Devis Sordulo", node 120:47 and
// 120:74), plus the MVP's Réseau, Contrats and Fichiers, and "Retours": one
// source, used full-width and icon-only. "Calendrier" gathers every visible
// project's dates (27/10/2026). "Calls" lists the calls of every visible
// project and the meetings. `disabled` keeps an item without a page visible,
// greyed (docs/DESIGN.md § 4). « PO », the assistant's page and the history
// of one's conversations with it (03/11/2026).
export type NavItem = {
  href: string;
  label: string;
  icon: typeof IconHouse2;
  exact?: boolean;
  adminOnly?: boolean;
  // Shown only to whoever holds it (Dépenses: the budget's readers), or one
  // of them (Deals: the negotiators, the direction, the project managers).
  permission?: Permission | readonly Permission[];
  disabled?: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: routes.app, label: fr.shell.nav.home, icon: IconHouse2, exact: true },
  { href: routes.assistant, label: fr.shell.nav.po, icon: IconSparkle3 },
  { href: routes.work, label: fr.shell.nav.work, icon: IconBriefcase },
  { href: routes.projects, label: fr.shell.nav.projects, icon: IconFolderOpen },
  {
    href: routes.calendar,
    label: fr.shell.nav.calendar,
    icon: IconCalendarDays,
  },
  { href: routes.calls, label: fr.shell.nav.calls, icon: IconPhone },
  // Studio sessions, planned and reported (retour d'Ibé du 01/11/2026).
  { href: routes.sessions, label: fr.shell.nav.sessions, icon: IconSliders },
  { href: routes.artists, label: fr.shell.nav.artists, icon: IconMicrophone },
  { href: routes.masters, label: fr.shell.nav.masters, icon: IconDisc },
  { href: routes.network, label: fr.shell.nav.network, icon: IconNodes },
  {
    href: routes.contracts,
    label: fr.shell.nav.contracts,
    icon: IconHandshake,
  },
  { href: routes.files, label: fr.shell.nav.files, icon: IconFile },
  // Every spend the reader may see, of the projects and the artists (BUD 3).
  {
    href: routes.expenses,
    label: fr.shell.nav.expenses,
    icon: IconMoneyBillCoin,
    permission: "read_artist_budgets",
  },
  // The team's spending as a whole (Sacha 12/11/2026): the direction, the
  // business managers and business.
  {
    href: routes.finance,
    label: fr.shell.nav.finance,
    icon: IconChartBarTrendUp,
    permission: "read_finance",
  },
  // The Business module's deals (BIZ 4): the negotiators, the direction,
  // and the project managers who open the deals of their projects.
  {
    href: routes.deals,
    label: fr.shell.nav.deals,
    icon: IconScale,
    permission: ["negotiate", "validate", "pilot_projects"],
  },
  {
    href: routes.members,
    label: fr.shell.nav.members,
    icon: IconUsers2,
    adminOnly: true,
  },
  // Not in the Figma: the feedback page (the director's inbox, everyone
  // else's own feedback). Sending opens the feedback window instead.
  { href: routes.feedback, label: fr.shell.nav.feedback, icon: IconMsgs },
  // Repérage (Sacha 03/11): artists spotted on TikTok, read from a screenshot.
  { href: routes.labo, label: fr.shell.nav.labo, icon: IconUserSearch },
] as const;

/** Whether an item is shown to whoever holds these permissions. */
export function navItemAllowed(
  item: NavItem,
  permissions: readonly Permission[],
): boolean {
  if (!item.permission) return true;
  const asked: readonly Permission[] =
    typeof item.permission === "string" ? [item.permission] : item.permission;
  return asked.some((p) => permissions.includes(p));
}
