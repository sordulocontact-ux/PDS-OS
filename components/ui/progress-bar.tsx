import { cn } from "@/lib/utils";

/** A thin progress bar (how much is done of a whole): announced as a
 * progressbar, filled in ink, moved by transform only. `tone="error"`: a
 * limit reached (requests to PO of the day). */
export function ProgressBar({
  value,
  max,
  label,
  tone = "ink",
}: {
  value: number;
  max: number;
  // Said to assistive technologies (« 3 sur 5 confirmés »).
  label: string;
  tone?: "ink" | "error";
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]"
    >
      <div
        className={cn(
          "h-full origin-left rounded-full transition-transform duration-[var(--duration-slide)] ease-[var(--ease-out)] motion-reduce:transition-none",
          tone === "error" ? "bg-error" : "bg-foreground",
        )}
        style={{ transform: `scaleX(${ratio})` }}
      />
    </div>
  );
}
