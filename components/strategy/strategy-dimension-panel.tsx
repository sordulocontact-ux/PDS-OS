"use client";

import { useRouter } from "next/navigation";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { DimensionStatus } from "@/lib/strategy/dimensions";
import { strategyDimensionTone } from "@/lib/ui/state-tones";

/**
 * The work panel of one dimension of the Stratégie, beside the pilotage.
 * Open while the URL names the dimension (?d=): a reload or a shared link
 * finds it open, and closing it goes back to the pilotage.
 */
export function StrategyDimensionPanel({
  status,
  closeHref,
  children,
}: {
  status: DimensionStatus;
  closeHref: string;
  // The dimension's work, rendered by the server.
  children: React.ReactNode;
}) {
  const t = fr.strategyPilot;
  const router = useRouter();
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.push(closeHref, { scroll: false });
      }}
    >
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="gap-2 px-5 pt-5 pr-14 md:px-8 md:pt-8">
          <div className="flex flex-wrap items-center gap-3">
            <SheetTitle className="text-display-sm font-semibold">
              {t.dimensions[status.key]}
            </SheetTitle>
            <StatusBadge tone={strategyDimensionTone[status.state]} size="sm">
              {t.states[status.state]}
            </StatusBadge>
          </div>
          <SheetDescription>{t.purposes[status.key]}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-10 px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
