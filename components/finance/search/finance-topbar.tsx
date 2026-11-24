"use client";

import { IconBell } from "nucleo-sharp-essential";
import { usePathname } from "next/navigation";

import { SectionTopbar } from "@/components/shell/section-topbar";
import {
  TopbarCrumb,
  type CrumbLink,
  type CrumbSwitcher,
} from "@/components/shell/topbar-crumb";
import { buttonVariants } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/count-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { financeSearch } from "@/lib/i18n/fr/finance-search";
import {
  FINANCE_SECTIONS,
  financeSectionActive,
} from "@/lib/ui/finance-sections";
import { cn } from "@/lib/utils";

import { FinanceSearch } from "./finance-search";
import { useFinancePulse } from "./use-finance-pulse";

/**
 * Finance's top band (SectionTopbar): where one is (Sacha 24/11/2026: the
 * section, or « Budgets / Ciel ouvert ⌄ » on a budget, `record`), Finance's
 * search on a phone only (on a desktop it heads the Finance sidebar), and
 * the bell opening the alerts with their count, red when one is serious.
 * Both are read after the page shows.
 */
export function FinanceTopbar({
  record,
}: {
  // A page under a section: its name, switching to another of its list.
  record?: { title: string; switcher?: CrumbSwitcher };
}) {
  const pathname = usePathname();
  const pulse = useFinancePulse();
  const count = pulse?.alerts.count ?? 0;
  const section = FINANCE_SECTIONS.find((s) =>
    financeSectionActive(s, pathname),
  );
  const parent: CrumbLink | null = section
    ? { label: section.label, href: section.href }
    : null;
  return (
    <SectionTopbar
      end={
        <>
          <div className="md:hidden">
            <FinanceSearch pulse={pulse} shortcut={false} iconOnly />
          </div>
          <ViewLink
            href={routes.financeAlerts}
            aria-label={financeSearch.bell(count)}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-sm" }),
              "relative shrink-0",
            )}
          >
            <IconBell aria-hidden />
            {count > 0 && (
              <CountBadge
                count={count}
                size="sm"
                className={cn(
                  "absolute -top-1.5 -right-1.5",
                  pulse?.alerts.danger &&
                    "bg-[var(--tone-danger-bg)] text-[color:var(--tone-danger-fg)]",
                )}
              />
            )}
          </ViewLink>
        </>
      }
    >
      {record ? (
        <TopbarCrumb
          parents={parent ? [parent] : []}
          title={record.title}
          switcher={record.switcher}
        />
      ) : (
        section && <TopbarCrumb title={section.label} />
      )}
    </SectionTopbar>
  );
}
