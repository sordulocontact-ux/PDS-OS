import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/utils/money";

/** An amount that comes in reads in green with its « + », one that goes
 * out with its « − »: the sign carries the meaning, the colour adds to it
 * (docs/STYLE-FINANCE-PARTOUT.md § 6.10). `sm`: inside a day of a
 * calendar. */
export function SignedAmount({
  event,
  size = "md",
}: {
  event: { direction: "in" | "out"; cents: number };
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "font-medium whitespace-nowrap tabular-nums",
        size === "sm" ? "text-micro" : "text-body-md",
        event.direction === "in" && "text-[color:var(--tone-success-fg)]",
      )}
    >
      {event.direction === "in" ? "+" : "−"}
      {formatAmount(event.cents, { ht: false })}
    </span>
  );
}
