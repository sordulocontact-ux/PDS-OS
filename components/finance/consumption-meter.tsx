import { BUDGET_ALERT_SHARE } from "@/lib/finance/cockpit";
import { cn } from "@/lib/utils";

/** The ink of a consumed share: red once the envelope is over, amber from
 * the alert share (`BUDGET_ALERT_SHARE`), ink below. */
export const consumedTone = (share: number) =>
  share >= 1 ? "error" : share >= BUDGET_ALERT_SHARE ? "warning" : "ink";

/**
 * « Consommé »: the share of an envelope already engaged, as a thin gauge
 * (Budgets' list and an envelope's page). `share` is 0 to 1 and beyond;
 * the bar stops at full.
 */
export function ConsumptionMeter({
  share,
  label,
  className,
}: {
  share: number;
  // Said to assistive technologies (« Tournage : 40 % du budget consommé »).
  label: string;
  className?: string;
}) {
  const tone = consumedTone(share);
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, Math.round(share * 100))}
      className={cn(
        "h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]",
        className,
      )}
    >
      <span
        className={cn(
          "block h-full rounded-full",
          tone === "error"
            ? "bg-[var(--error)]"
            : tone === "warning"
              ? "bg-[var(--tone-warning-fg)]"
              : "bg-[var(--text-primary)]",
        )}
        style={{ width: `${Math.min(100, share * 100)}%` }}
      />
    </div>
  );
}
