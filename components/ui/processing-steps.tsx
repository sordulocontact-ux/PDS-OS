import { IconCheck, IconLoader } from "nucleo-sharp-essential";

import { cn } from "@/lib/utils";

export type StepState = "done" | "active" | "waiting";

/** Where a long task stands (a call after its recording, a search): one line per step, in order. */
export function ProcessingSteps({
  label,
  doneLabel,
  steps,
  idle = false,
}: {
  label: string;
  // The step in progress waits for a person, not for the machine: a dot,
  // never a spinner (the SACEM declaration's frise).
  idle?: boolean;
  // Read after a finished step: the check mark alone is not announced.
  doneLabel: string;
  steps: Array<{ key: string; label: string; state: StepState }>;
}) {
  return (
    <ol aria-label={label} className="grid gap-3">
      {steps.map((step) => (
        <li
          key={step.key}
          aria-current={step.state === "active" ? "step" : undefined}
          className={cn(
            "flex items-center gap-3 text-sm",
            step.state === "waiting" && "text-muted-foreground",
            step.state === "active" && "font-medium",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border",
              step.state === "done"
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card",
            )}
          >
            {step.state === "done" && <IconCheck className="size-3.5" />}
            {step.state === "active" &&
              (idle ? (
                <span className="size-2 rounded-full bg-foreground" />
              ) : (
                <IconLoader className="size-3.5 animate-spin motion-reduce:animate-none" />
              ))}
          </span>
          {step.label}
          {step.state === "done" && (
            <span className="sr-only"> ({doneLabel})</span>
          )}
        </li>
      ))}
    </ol>
  );
}
