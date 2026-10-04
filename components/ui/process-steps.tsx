import { IconCheck } from "nucleo-sharp-essential";

import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

export type ProcessStep = {
  key: string;
  label: string;
  // Absent when the step cannot be opened (no page yet, or locked): shown,
  // not linked, `title` says why.
  href?: string;
  title?: string;
  // The page open right now: filled in ink. A place, not a state.
  current?: boolean;
  // Validated for real (computed by the code): a check instead of the number.
  done?: boolean;
};

// The steps of a process as chevrons, under the project header (Figma
// "PDS OS", node 1510:3096): Workflow, Juridique. Two signals never mixed:
// the fill says which page is open, the circle says what is validated.
// Wider than its column, the row scrolls on its own.
export function ProcessSteps({
  label,
  steps,
  numbered = true,
}: {
  label: string;
  steps: ProcessStep[];
  // A circle with the step's number (or a check once validated).
  numbered?: boolean;
}) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ol className="flex w-max overflow-hidden rounded-pill">
        {steps.map((step, index) => {
          const inner = (
            <>
              {numbered && (
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-current text-caption font-semibold"
                >
                  {step.done ? <IconCheck className="size-3.5" /> : index + 1}
                </span>
              )}
              <span className="text-body-md">{step.label}</span>
              {step.done && (
                <span className="sr-only">, {fr.shell.processSteps.done}</span>
              )}
            </>
          );
          const shape = cn(
            "process-step flex h-11 items-center gap-2 whitespace-nowrap no-underline",
            // Clear of the notch on the left and of the point on the right.
            index === 0 ? "pl-4" : "pl-8",
            index === steps.length - 1 ? "pr-4" : "pr-6",
            step.current
              ? "bg-foreground text-background"
              : "bg-[var(--surface-sunken)] text-foreground",
          );
          return (
            <li key={step.key} className="flex">
              {step.href ? (
                <ViewLink
                  href={step.href}
                  aria-current={step.current ? "page" : undefined}
                  className={cn(
                    shape,
                    "transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:outline-offset-[-5px]",
                    !step.current && "hover:bg-[var(--surface-pressed)]",
                  )}
                >
                  {inner}
                </ViewLink>
              ) : (
                <span
                  aria-disabled
                  title={step.title}
                  className={cn(shape, "cursor-not-allowed text-muted-foreground")}
                >
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
