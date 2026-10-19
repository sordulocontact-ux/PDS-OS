import { cn } from "@/lib/utils";

/**
 * A frieze of phases (proto `frise`): one segment per phase, done ones
 * green, the current one blue, the rest grey. Small: 18 px segments and the
 * current phase's label after them (a line of a list). `big`: full width,
 * each segment with its name under a 4 px rule (the open item's head).
 * `current`: index of the current phase, `phases.length` when all are done,
 * -1 for none (cancelled: only `label` shows).
 */
export function PhaseStrip({
  phases,
  current,
  label,
  big = false,
  className,
}: {
  phases: readonly string[];
  current: number;
  // The label said after a small frieze and read by assistive tech.
  label: string;
  big?: boolean;
  className?: string;
}) {
  if (current < 0)
    return (
      <span
        className={cn(
          "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]",
          className,
        )}
      >
        {label}
      </span>
    );
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "flex items-center",
        big ? "w-full gap-1.5" : "gap-[3px]",
        className,
      )}
    >
      {phases.map((phase, i) => {
        const state = i < current ? "done" : i === current ? "cur" : "todo";
        return big ? (
          <span
            key={phase}
            aria-hidden
            className={cn(
              "min-w-0 flex-1 truncate border-t-4 pt-1.5 text-[length:var(--type-micro)] leading-[var(--type-micro-lh)]",
              state === "done" &&
                "border-[color:var(--tone-success-fg)] text-[color:var(--text-tertiary)]",
              state === "cur" &&
                "border-[color:var(--selection)] font-semibold text-foreground",
              state === "todo" &&
                "border-[color:var(--border-hairline)] text-[color:var(--text-tertiary)]",
            )}
          >
            {phase}
          </span>
        ) : (
          <span
            key={phase}
            aria-hidden
            className={cn(
              "h-1 w-[18px] rounded-sm",
              state === "done" && "bg-[var(--tone-success-fg)]",
              state === "cur" && "bg-[var(--selection)]",
              state === "todo" && "bg-[var(--border-hairline)]",
            )}
          />
        );
      })}
      {!big && (
        <span
          aria-hidden
          className="ml-1.5 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]"
        >
          {label}
        </span>
      )}
    </span>
  );
}
