import { StatusBadge } from "@/components/ui/status-badge";
import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { dealStageToneOf } from "@/lib/ui/state-tones";

const fr = { deals };

/** A deal's stage in words, « Accord de principe à valider » while the
 * direction decides it (BIZ 4), in green once validated. */
export function DealStageBadge({
  deal,
  size = "sm",
}: {
  deal: Pick<Deal, "stage" | "agreementStatus">;
  size?: "sm" | "md";
}) {
  const label =
    deal.stage === "agreement" && deal.agreementStatus
      ? fr.deals.agreement[deal.agreementStatus]
      : fr.deals.stages[deal.stage];
  return (
    <StatusBadge tone={dealStageToneOf(deal)} size={size}>
      {label}
    </StatusBadge>
  );
}
