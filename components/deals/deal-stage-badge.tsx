import { StatusBadge } from "@/components/ui/status-badge";
import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { dealStageTone } from "@/lib/ui/state-tones";

const fr = { deals };

/** A deal's stage in words, « Accord de principe à valider » while the
 * direction decides it (BIZ 4). */
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
    <StatusBadge tone={dealStageTone[deal.stage]} size={size}>
      {label}
    </StatusBadge>
  );
}
