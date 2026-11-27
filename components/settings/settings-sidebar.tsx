"use client";

import { usePathname } from "next/navigation";

import {
  ContextNavGroupTitle,
  ContextNavLink,
  ContextSidebar,
} from "@/components/shell/context-sidebar";
import { settings } from "@/lib/i18n/fr/settings";
import {
  SETTINGS_SECTIONS,
  type SettingsPage,
} from "@/lib/ui/settings-sections";

const fr = { settings };

/**
 * Paramètres' second sidebar (Sacha 27/11/2026, after Accordee: « tout est
 * dans un seul endroit, fais une double side bar »), against the main
 * sidebar collapsed to icons, as Finance's: the reader's own pages, then the
 * direction's. Desktop only (the pages' tabs on a phone).
 */
export function SettingsSidebar({ pages }: { pages: SettingsPage[] }) {
  const pathname = usePathname();
  const t = fr.settings;
  const groups = [
    { key: "mine", pages: pages.filter((p) => !SETTINGS_SECTIONS[p].admin) },
    { key: "admin", pages: pages.filter((p) => SETTINGS_SECTIONS[p].admin) },
  ] as const;
  return (
    <ContextSidebar
      label={t.navLabel}
      head={
        <p className="px-2.5 py-2 text-body-md font-semibold text-[color:var(--text-primary)]">
          {t.title}
        </p>
      }
    >
      {groups.map(
        (group) =>
          group.pages.length > 0 && (
            <div
              key={group.key}
              role="group"
              aria-labelledby={`settings-${group.key}`}
            >
              <ContextNavGroupTitle id={`settings-${group.key}`}>
                {t.groups[group.key]}
              </ContextNavGroupTitle>
              <ul className="flex flex-col gap-px">
                {group.pages.map((page) => {
                  const { href, icon: Icon } = SETTINGS_SECTIONS[page];
                  return (
                    <li key={page}>
                      <ContextNavLink
                        href={href}
                        active={
                          pathname === href || pathname.startsWith(`${href}/`)
                        }
                      >
                        <Icon aria-hidden className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1">{t.pages[page]}</span>
                      </ContextNavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ),
      )}
    </ContextSidebar>
  );
}
