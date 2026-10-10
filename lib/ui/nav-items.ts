import {
  IconCalendarDays,
  IconFile,
  IconFolderOpen,
  IconHandshake,
  IconHouse2,
  IconLightbulbSparkle,
  IconMicrophone,
  IconMsgs,
  IconNodes,
  IconPhone,
  IconUsers2,
} from "nucleo-sharp-essential";

import { IconBriefcase, IconDisc } from "@/components/icons";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// The 8 items of the main sidebar (Figma "Devis Sordulo", node 120:47 and
// 120:74), plus the MVP's Réseau, Contrats and Fichiers, and "Retours": one
// source, used full-width and icon-only. "Calendrier" has no
// organization-wide page yet — kept visible, disabled, per docs/DESIGN.md
// § 4. "Calls" lists the calls of every visible project and the meetings.
export type NavItem = {
  href: string;
  label: string;
  icon: typeof IconHouse2;
  exact?: boolean;
  adminOnly?: boolean;
  disabled?: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: routes.app, label: fr.shell.nav.home, icon: IconHouse2, exact: true },
  { href: routes.work, label: fr.shell.nav.work, icon: IconBriefcase },
  { href: routes.projects, label: fr.shell.nav.projects, icon: IconFolderOpen },
  {
    href: "#",
    label: fr.shell.nav.calendar,
    icon: IconCalendarDays,
    disabled: true,
  },
  { href: routes.calls, label: fr.shell.nav.calls, icon: IconPhone },
  { href: routes.artists, label: fr.shell.nav.artists, icon: IconMicrophone },
  { href: routes.masters, label: fr.shell.nav.masters, icon: IconDisc },
  { href: routes.network, label: fr.shell.nav.network, icon: IconNodes },
  {
    href: routes.contracts,
    label: fr.shell.nav.contracts,
    icon: IconHandshake,
  },
  { href: routes.files, label: fr.shell.nav.files, icon: IconFile },
  {
    href: routes.members,
    label: fr.shell.nav.members,
    icon: IconUsers2,
    adminOnly: true,
  },
  // Not in the Figma: the feedback page (the director's inbox, everyone
  // else's own feedback). Sending opens the feedback window instead.
  { href: routes.feedback, label: fr.shell.nav.feedback, icon: IconMsgs },
  // Features on trial before they enter the app (TikTok screenshots → artists).
  { href: routes.labo, label: fr.shell.nav.labo, icon: IconLightbulbSparkle },
] as const;
