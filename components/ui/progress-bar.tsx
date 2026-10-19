import { cn } from "@/lib/utils";

/** A thin progress bar (how much is done of a whole): announced as a
 * progressbar, filled in ink, moved by transform only. `tone="error"`: a
 * limit reached (requests to PO of the day); `tone="success"` with
 * `size="sm"`: a workflow's steps done (4 px on a hairline rail, proto
 * « Projet complet », `.prog`). */
export function ProgressBar({
  value,
  max,
  label,
  tone = "ink",
  size = "md",
}: {
  value: number;
  max: number;
  // Said to assistive technologies (« 3 sur 5 confirmés »).
  label: string;
  tone?: "ink" | "error" | "success";
  size?: "md" | "sm";
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
        "w-full overflow-hidden",
        size === "sm"
          ? "h-1 rounded-xs bg-[var(--border-hairline)]"
          : "h-1.5 rounded-full bg-[var(--surface-sunken)]",
      )}
    >
      <div
        className={cn(
          "h-full origin-left transition-transform duration-[var(--duration-slide)] ease-[var(--ease-out)] motion-reduce:transition-none",
          size === "sm" ? "rounded-xs" : "rounded-full",
          tone === "error"
            ? "bg-error"
            : tone === "success"
              ? "bg-[var(--tone-success-fg)]"
              : "bg-foreground",
        )}
        style={{ transform: `scaleX(${ratio})` }}
      />
    </div>
  );
}
