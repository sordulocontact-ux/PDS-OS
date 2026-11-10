import { journey } from "@/lib/i18n/fr/journey";
import type { JourneyStep } from "@/lib/ui/journey";
import { formatDay } from "@/lib/utils/day";
import { cn } from "@/lib/utils";

const fr = { journey };

export type StepHead = Pick<JourneyStep, "title"> &
  Partial<Pick<JourneyStep, "why" | "due" | "status" | "alert">>;

/**
 * « Avant le Sam. 05/12 » on the right of an open step's title, while it is
 * not done: quieter than the why under the title (Figma, 10/11/2026), loud
 * once overdue.
 */
export function StepDue({ step }: { step: StepHead }) {
  if (!step.due || step.status === "done") return null;
  return (
    <span
      className={cn(
        "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-muted)]",
        step.alert === "overdue" &&
          "font-semibold text-[color:var(--tone-danger-fg)]",
      )}
    >
      {fr.journey.meta.due(formatDay(step.due))}
    </span>
  );
}
