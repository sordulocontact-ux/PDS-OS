"use client";

import { usePathname } from "next/navigation";

import { useFinancePulse } from "@/components/finance/search/use-finance-pulse";
import {
  ContextNavLink,
  ContextSidebar,
} from "@/components/shell/context-sidebar";
import { CountBadge } from "@/components/ui/count-badge";
import { finance } from "@/lib/i18n/fr/finance";
import { treasury } from "@/lib/i18n/fr/treasury";
import {
  FINANCE_SECTIONS,
  financeSectionActive,
} from "@/lib/ui/finance-sections";

const fr = { finance, treasury };

/**
 * Finance's second sidebar (Sacha 13/11/2026, « double sidebar comme le
 * projet »), right against the main sidebar collapsed to icons. New style
 * (15/11/2026, docs/FINANCE-V2.md, after Midday): one flat list, each
 * section with its icon, in the order of a day's work, with what waits in
 * it (operations to reconcile, proofs to process, late invoices; lot 5, as
 * the proto). Desktop only.
 */
export function FinanceSidebar() {
  const pathname = usePathname();
  const t = fr.treasury.tabs;
  const counts = useFinancePulse()?.counts;
  const waiting: Partial<Record<string, number>> = {
    reconcile: counts?.reconcile,
    receipts: counts?.receipts,
    incomes: counts?.incomes,
  };
  return (
    <ContextSidebar
      label={t.label}
      head={
        <p className="px-2.5 py-2 text-body-md font-semibold text-[color:var(--text-primary)]">
          {fr.finance.title}
        </p>
      }
    >
      <ul className="flex flex-col gap-px pt-1">
        {FINANCE_SECTIONS.map((section) => {
          const Icon = section.icon;
          const count = waiting[section.key] ?? 0;
          return (
            <li key={section.key}>
              <ContextNavLink
                href={section.href}
                active={financeSectionActive(section, pathname)}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                <span className="min-w-0 flex-1">{section.label}</span>
                {count > 0 && (
                  <>
                    <CountBadge count={count} />
                    <span className="sr-only">{t.waiting(count)}</span>
                  </>
                )}
              </ContextNavLink>
            </li>
          );
        })}
      </ul>
    </ContextSidebar>
  );
}
