"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";

import { Button } from "@/components/ui/button";

const CloseAccordion = createContext<(() => void) | null>(null);

/**
 * Closes the row unfolded in an AccordionSteps list, for a form that just
 * saved its answer (the list folds back on save). Null outside such a list.
 */
export function useCloseAccordion() {
  return useContext(CloseAccordion);
}

/**
 * The unfolded work of one row of an AccordionSteps list (the Stratégie's
 * dimensions, the Conception's questions), under its row. On opening (a
 * click, or a link from elsewhere) its row is brought back into view if
 * another row folding above pushed it away.
 */
export function AccordionRegion({
  id,
  headerId,
  closeHref,
  description,
  doneLabel,
  children,
}: {
  id: string;
  // The row that unfolds this region, kept in view.
  headerId: string;
  closeHref: string;
  // What the row decides, one sentence.
  description?: string;
  // A row made of a list (levers, budget lines…) stays open while
  // items are added one by one: this button (« Terminé ») folds it back.
  doneLabel?: string;
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
    <CloseAccordion.Provider value={close}>
      <div
        id={id}
        role="region"
        aria-labelledby={headerId}
        className="flex flex-col gap-6 px-4 pt-1 pb-5 transition-[opacity,translate] duration-[var(--duration-slide)] ease-[var(--ease-out)] motion-reduce:translate-none sm:pl-15 starting:-translate-y-1 starting:opacity-0"
      >
        {description && (
          <p className="text-body-md text-muted-foreground">{description}</p>
        )}
        <div className="flex flex-col gap-10">{children}</div>
        {doneLabel && (
          <div className="flex justify-end">
            <Button onClick={close}>{doneLabel}</Button>
          </div>
        )}
      </div>
    </CloseAccordion.Provider>
  );
}

const smooth = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
