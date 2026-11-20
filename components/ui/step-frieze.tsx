import { IconCheck } from "nucleo-sharp-essential";

import { cn } from "@/lib/utils";

export type FriezeStep = {
  key: string;
  label: string;
  state: "done" | "current" | "todo";
  // The day it was reached (« 12/11 »), null for one to come.
  date?: string | null;
};

/**
 * Stages as a frieze of points (proto « Fiche d'un deal » v2, Sacha
 * 20/11/2026: « c'est pas la bonne frise »): one point per stage on a line,
 * a reached one filled with its check, the current one ringed in the
 * selection colour, each with its name and the day it was reached under it
 * (docs/VISION-UX.md rule 7). On a phone, the frieze scrolls in its own box.
 * `doneLabel` is read after a reached stage (the check is not announced).
 */
export function StepFrieze({
  label,
  doneLabel,
  steps,
}: {
  label: string;
  doneLabel: string;
  steps: readonly FriezeStep[];
}) {
  return (
    // Padded by the current point's 4 px ring, which the scrolling box would
    // clip otherwise; the negative margin keeps the points on the page's edge.
    <ol aria-label={label} className="-m-1.5 flex overflow-x-auto p-1.5">
      {steps.map((step) => (
        <li
          key={step.key}
          aria-current={step.state === "current" ? "step" : undefined}
          className={cn(
            "relative flex min-w-[72px] flex-1 flex-col gap-1.5",
            "before:absolute before:top-[9px] before:right-0 before:left-5 before:h-0.5 before:bg-[var(--border-hairline)] last:before:hidden",
            step.state === "done" && "before:bg-foreground",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "relative z-[1] grid size-5 place-items-center rounded-full border-[1.5px] border-[color:var(--border-default)] bg-[var(--surface-page)]",
              step.state === "done" &&
                "border-foreground bg-foreground text-background",
              step.state === "current" &&
                "border-[color:var(--selection)] shadow-[0_0_0_4px_var(--selection-bg)]",
            )}
          >
            {step.state === "done" && <IconCheck className="size-3" />}
            {step.state === "current" && (
              <span className="size-2 rounded-full bg-[var(--selection)]" />
            )}
          </span>
          <span
            className={cn(
              "pr-2 text-caption",
              step.state === "current"
                ? "font-semibold text-foreground"
                : "text-[color:var(--text-secondary)]",
            )}
          >
            {step.label}
            {step.state === "done" && (
              <span className="sr-only"> ({doneLabel})</span>
            )}
          </span>
          {step.date && (
            <span className="text-caption text-[color:var(--text-tertiary)] tabular-nums">
              {step.date}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
