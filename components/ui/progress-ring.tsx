import { cn } from "@/lib/utils";

const RADIUS = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** How much is done of a whole as a ring with its percentage in the middle
 * (a workflow's card on the overview): same meaning and colours as
 * ProgressBar, announced as a progressbar. `value` and `max` come from the
 * code (steps really done), never from the drawing. */
export function ProgressRing({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  // Said to assistive technologies (« 2 étapes sur 4 »).
  label: string;
  className?: string;
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className={cn(
        "relative flex size-14 shrink-0 items-center justify-center",
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 56 56"
        className="absolute inset-0 size-full -rotate-90"
      >
        <circle
          cx="28"
          cy="28"
          r={RADIUS}
          fill="none"
          strokeWidth="4"
          className="stroke-[var(--surface-sunken)]"
        />
        <circle
          cx="28"
          cy="28"
          r={RADIUS}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          className="stroke-foreground transition-[stroke-dashoffset] duration-[var(--duration-slide)] ease-[var(--ease-out)] motion-reduce:transition-none"
          style={{ strokeDashoffset: CIRCUMFERENCE * (1 - ratio) }}
          // A ring with nothing done stays a bare track.
          visibility={ratio === 0 ? "hidden" : undefined}
        />
      </svg>
      <span aria-hidden className="text-caption font-semibold tabular-nums">
        {Math.round(ratio * 100)}%
      </span>
    </div>
  );
}
