import type { TreasuryEvent } from "@/lib/finance/treasury";
import { formatAmount } from "@/lib/utils/money";

/** An amount that comes in reads in green with its « + », one that goes
 * out with its « − »: the sign carries the meaning, the colour adds to it. */
export function SignedAmount({
  event,
}: {
  event: Pick<TreasuryEvent, "direction" | "cents">;
}) {
  return (
    <span
      className={`text-body-md font-medium whitespace-nowrap tabular-nums ${
        event.direction === "in" ? "text-[color:var(--tone-success-fg)]" : ""
      }`}
    >
      {event.direction === "in" ? "+" : "−"}
      {formatAmount(event.cents, { ht: false })}
    </span>
  );
}
