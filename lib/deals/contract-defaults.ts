import type { DealContractDefaults } from "@/components/deals/deal-contract-create";
import { dealName } from "@/lib/deals/names";
import type { Deal } from "@/lib/deals/types";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";

/** What a deal's new contract knows from it: its name, a licence with a
 * label, a partnership with a brand, an artist contract otherwise. */
export function dealContractDefaults(deal: Deal): DealContractDefaults {
  return {
    title: dealMemos.contract.title(dealName(deal)),
    type:
      deal.kind === "label"
        ? "license"
        : deal.kind === "brand_partnership"
          ? "partnership"
          : "artist",
    artistId: deal.artistId,
    projectId: deal.projectId,
  };
}
