import {
  IconBell,
  IconCreditCard,
  IconEyeOpen,
  IconGauge3,
  IconKeyboard4,
  IconPlug,
} from "nucleo-sharp-essential";

import { IconDisc } from "@/components/icons";
import { routes } from "@/lib/auth/redirects";

/**
 * The pages of Paramètres (27/11/2026), in the order of the section's
 * column: the reader's own, then the direction's (`admin`).
 */
export const SETTINGS_PAGES = [
  "usage",
  "appearance",
  "notifications",
  "shortcuts",
  "connections",
  "billing",
  "distribution",
] as const;

export type SettingsPage = (typeof SETTINGS_PAGES)[number];

export const SETTINGS_SECTIONS: Record<
  SettingsPage,
  { href: string; icon: typeof IconBell; admin: boolean }
> = {
  usage: { href: routes.settingsUsage, icon: IconGauge3, admin: false },
  appearance: {
    href: routes.settingsAppearance,
    icon: IconEyeOpen,
    admin: false,
  },
  notifications: {
    href: routes.settingsNotifications,
    icon: IconBell,
    admin: false,
  },
  shortcuts: {
    href: routes.settingsShortcuts,
    icon: IconKeyboard4,
    admin: false,
  },
  connections: {
    href: routes.settingsConnections,
    icon: IconPlug,
    admin: false,
  },
  billing: { href: routes.settingsBilling, icon: IconCreditCard, admin: true },
  distribution: {
    href: routes.settingsDistribution,
    icon: IconDisc,
    admin: true,
  },
};

/** The pages the reader may open, in order. */
export function settingsPagesFor(admin: boolean): SettingsPage[] {
  return SETTINGS_PAGES.filter(
    (page) => admin || !SETTINGS_SECTIONS[page].admin,
  );
}
