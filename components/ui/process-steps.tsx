import { IconCheck, IconLock } from "nucleo-sharp-essential";

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
  // Waits for an earlier step: still linked (readable), marked by a lock in
  // the `pills` look.
  locked?: boolean;
};

// The steps of a process as chevrons, under the project header (Figma
// "PDS OS", node 1510:3096): Workflow, Juridique. Two signals never mixed:
// the fill says which page is open, the circle says what is validated.
// Wider than its column, the row scrolls on its own.
export function ProcessSteps({
  label,
  steps,
  numbered = true,
  look = "chevrons",
}: {
  label: string;
  steps: ProcessStep[];
  // A circle with the step's number (or a check once validated).
  numbered?: boolean;
  // `pills`: the guided journey's look (docs/VISION-UX.md § 4, proto
  // `.chevrons`), separate pills that wrap, a green check when done, a lock
  // when waiting.
  look?: "chevrons" | "pills";
}) {
  if (look === "pills") return <StepPills label={label} steps={steps} />;
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
              {/* Without a number, the check stands alone before the label. */}
              {!numbered && step.done && (
                <IconCheck aria-hidden className="size-3.5 shrink-0" />
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

function StepPills({ label, steps }: { label: string; steps: ProcessStep[] }) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap gap-1">
        {steps.map((step) => {
          const inner = (
            <>
              {step.done ? (
                <span
                  aria-hidden
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full",
                    // On the ink of the open step, green would clash: the
                    // check takes the pill's own colours, inverted.
                    step.current
                      ? "bg-background text-foreground"
                      : "bg-[var(--tone-success-bg)] text-[color:var(--tone-success-fg)]",
                  )}
                >
                  <IconCheck className="size-3" />
                </span>
              ) : step.locked ? (
                <IconLock aria-hidden className="size-3 shrink-0 opacity-60" />
              ) : null}
              <span className="text-body-sm">{step.label}</span>
              {step.done && (
                <span className="sr-only">, {fr.shell.processSteps.done}</span>
              )}
            </>
          );
          const shape = cn(
            "inline-flex h-9 items-center gap-2 rounded-pill px-3.5 whitespace-nowrap no-underline",
            step.current
              ? "bg-foreground text-background"
              : "bg-[var(--surface-soft)] text-[color:var(--text-secondary)]",
          );
          return (
            <li key={step.key} className="flex">
              {step.href ? (
                <ViewLink
                  href={step.href}
                  aria-current={step.current ? "page" : undefined}
                  className={cn(
                    shape,
                    "transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-standard)]",
                    !step.current &&
                      "hover:bg-[var(--surface-sunken)] hover:text-foreground",
                  )}
                >
                  {inner}
                </ViewLink>
              ) : (
                <span
                  aria-disabled
                  title={step.title}
                  className={cn(shape, "cursor-not-allowed")}
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
