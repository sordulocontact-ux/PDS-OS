"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

const CloseDimension = createContext<(() => void) | null>(null);

/**
 * Closes the dimension unfolded on the pilotage, for a form that just saved
 * its answer (the pilotage folds back on save). Null outside the pilotage.
 */
export function useCloseDimension() {
  return useContext(CloseDimension);
}

/**
 * The unfolded work of one dimension of the Stratégie, under its row. On
 * opening (a click, or a link from the Brief or the Planning) its row is
 * brought back into view if another dimension folding above pushed it away.
 */
export function DimensionRegion({
  id,
  headerId,
  closeHref,
  description,
  withDone,
  children,
}: {
  id: string;
  // The row that unfolds this region, kept in view.
  headerId: string;
  closeHref: string;
  // What the dimension decides, one sentence.
  description: string;
  // A dimension made of a list (levers, budget lines…) stays open while
  // items are added one by one: « Terminé » folds it back.
  withDone: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const header = document.getElementById(headerId);
    if (!header) return;
    const { top } = header.getBoundingClientRect();
    if (top < 0 || top > window.innerHeight * 0.6)
      header.scrollIntoView({ block: "start", behavior: smooth() });
  }, [headerId]);

  const close = () => {
    // A long work scrolled past its row: back to the row before folding.
    const header = document.getElementById(headerId);
    if (header && header.getBoundingClientRect().top < 0)
      header.scrollIntoView({ block: "start" });
    router.push(closeHref, { scroll: false });
  };

  return (
    <CloseDimension.Provider value={close}>
      <div
        id={id}
        role="region"
        aria-labelledby={headerId}
        className="flex flex-col gap-6 px-4 pt-1 pb-5 transition-[opacity,translate] duration-[var(--duration-slide)] ease-[var(--ease-out)] motion-reduce:translate-none sm:pl-15 starting:-translate-y-1 starting:opacity-0"
      >
        <p className="text-body-md text-muted-foreground">{description}</p>
        <div className="flex flex-col gap-10">{children}</div>
        {withDone && (
          <div className="flex justify-end">
            <Button onClick={close}>{fr.strategyPilot.done}</Button>
          </div>
        )}
      </div>
    </CloseDimension.Provider>
  );
}

const smooth = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
