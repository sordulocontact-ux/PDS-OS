"use client";

import { usePathname } from "next/navigation";
import { useId } from "react";

import {
  ContextNavGroupTitle,
  ContextNavLink,
  ContextSidebar,
} from "@/components/shell/context-sidebar";
import { finance } from "@/lib/i18n/fr/finance";
import { treasury } from "@/lib/i18n/fr/treasury";
import {
  FINANCE_GROUPS,
  FINANCE_SECTIONS,
  financeSectionActive,
} from "@/lib/ui/finance-sections";

const fr = { finance, treasury };

/**
 * Finance's second sidebar (Sacha 13/11/2026, « double sidebar comme le
 * projet »; the side menu of Ibé's ticket): its nine sections in four
 * groups, right against the main sidebar collapsed to icons. Desktop only.
 */
export function FinanceSidebar() {
  const pathname = usePathname();
  const id = useId();
  const t = fr.treasury.tabs;
  return (
    <ContextSidebar
      label={t.label}
      head={
        <p className="px-2.5 py-2 text-body-md font-medium text-[color:var(--text-primary)]">
          {fr.finance.title}
        </p>
      }
    >
      {FINANCE_GROUPS.map((group) => (
        <div key={group} className="flex flex-col">
          <ContextNavGroupTitle id={`${id}-${group}`}>
            {t.groups[group]}
          </ContextNavGroupTitle>
          <ul
            className="flex flex-col gap-px"
            aria-labelledby={`${id}-${group}`}
          >
            {FINANCE_SECTIONS.filter((s) => s.group === group).map(
              (section) => (
                <li key={section.key}>
                  <ContextNavLink
                    href={section.href}
                    active={financeSectionActive(section, pathname)}
                  >
                    <span className="min-w-0 flex-1">{section.label}</span>
                  </ContextNavLink>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </ContextSidebar>
  );
}
