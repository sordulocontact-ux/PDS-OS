import { IconChevronDown } from "nucleo-sharp-essential";

import { AccordionRegion } from "@/components/shell/accordion-region";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import type { Tone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

export type AccordionStep = {
  key: string;
  title: string;
  // One line written by code, hidden while the row is open.
  summary: string;
  state: { label: string; tone: Tone };
  // Opens this row (the URL names it, so a reload finds it open).
  href: string;
};

/**
 * Numbered rows unfolded in place, one at a time, chevron on the right: the
 * Stratégie's dimensions, the Conception's questions. Each row shows its
 * name, a summary and its state; the open one shows its work (`children`)
 * under it, folded back by « Enregistrer » (useCloseAccordion) or by
 * `doneLabel`.
 */
export function AccordionSteps({
  label,
  idPrefix,
  steps,
  current,
  closeHref,
  description,
  doneLabel,
  children,
}: {
  // Names the list for assistive technologies.
  label: string;
  idPrefix: string;
  steps: AccordionStep[];
  // The open row, if any.
  current: string | null;
  closeHref: string;
  // What the open row decides, one sentence.
  description?: string;
  doneLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-col gap-2">
        {steps.map((step, index) => {
          const open = current === step.key;
          const headerId = `${idPrefix}-${step.key}`;
          const regionId = `${headerId}-work`;
          return (
            <li
              key={step.key}
              className="rounded-2xl border border-border bg-background"
            >
              <ViewLink
                id={headerId}
                href={open ? closeHref : step.href}
                scroll={false}
                aria-expanded={open}
                aria-controls={open ? regionId : undefined}
                className={cn(
                  "flex scroll-mt-6 items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--control-bg-hover)]",
                  open && "rounded-b-none",
                )}
              >
                <span className="w-8 shrink-0 self-start text-body-md font-medium text-muted-foreground tabular-nums sm:self-center">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {/* Name and summary, the state under them on a phone. */}
                <span className="flex min-w-0 flex-1 flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <span className="flex w-full min-w-0 flex-col gap-0.5 sm:flex-1">
                    <span className="text-body-md font-semibold text-foreground">
                      {step.title}
                    </span>
                    {!open && (
                      <span className="truncate text-caption text-muted-foreground">
                        {step.summary}
                      </span>
                    )}
                  </span>
                  <StatusBadge tone={step.state.tone} size="sm">
                    {step.state.label}
                  </StatusBadge>
                </span>
                <IconChevronDown
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)] motion-reduce:transition-none",
                    open && "rotate-180",
                  )}
                />
              </ViewLink>
              {open && (
                <AccordionRegion
                  id={regionId}
                  headerId={headerId}
                  closeHref={closeHref}
                  description={description}
                  doneLabel={doneLabel}
                >
                  {children}
                </AccordionRegion>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
