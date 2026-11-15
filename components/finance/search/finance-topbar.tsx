"use client";

import { IconBell } from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/count-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { financeSearch } from "@/lib/i18n/fr/finance-search";
import { cn } from "@/lib/utils";

import { FinanceSearch } from "./finance-search";
import { useFinancePulse } from "./use-finance-pulse";

/**
 * The top row of every Finance page (docs/FINANCE-V2.md, lot 5, after
 * Midday): the ⌘K search on the left, the page's own action, then the bell
 * opening the alerts with their count, red when one is serious. Both are
 * read after the page shows.
 */
export function FinanceTopbar({ children }: { children?: ReactNode }) {
  const pulse = useFinancePulse();
  const count = pulse?.alerts.count ?? 0;
  return (
    <div className="flex items-center gap-2">
      <FinanceSearch pulse={pulse} />
      <div className="ml-auto flex items-center gap-2">
        {children}
        <ViewLink
          href={routes.financeAlerts}
          aria-label={financeSearch.bell(count)}
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "relative",
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
    </div>
  );
}
