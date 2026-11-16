"use client";

import { IconBell } from "nucleo-sharp-essential";

import { buttonVariants } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/count-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { financeSearch } from "@/lib/i18n/fr/finance-search";
import { cn } from "@/lib/utils";

import { FinanceSearch } from "./finance-search";
import { useFinancePulse } from "./use-finance-pulse";

/**
 * The top band of every Finance page (docs/FINANCE-V2.md, lot 5, as the
 * proto after Midday): the whole width of the page, a hairline under it,
 * kept at the top while the page scrolls; the ⌘K search across the line,
 * borderless, and the bell opening the alerts with their count, red when
 * one is serious. Both are read after the page shows.
 */
export function FinanceTopbar() {
  const pulse = useFinancePulse();
  const count = pulse?.alerts.count ?? 0;
  return (
    <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[color:var(--border-hairline)] bg-[var(--background)] px-4 md:px-[var(--page-gutter)]">
      <FinanceSearch pulse={pulse} />
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
    </div>
  );
}
