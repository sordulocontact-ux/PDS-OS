"use server";

import { requireApproved } from "@/lib/auth/dal";
import {
  loadNewDealOptions,
  type NewDealOptions,
} from "@/lib/deals/new-deal-options";
import { loadDeals } from "@/lib/deals/queries";

/**
 * « Nouveau deal » options for a form opened outside the Deals page (the
 * shell's « + »): the same read as the page, with the reader's session
 * (RLS decides what is seen). Null when the reader opens no deal.
 */
export async function loadNewDealOptionsForReader(): Promise<NewDealOptions | null> {
  const access = await requireApproved();
  const { deals } = await loadDeals(access);
  return loadNewDealOptions(
    access,
    new Set(
      deals.flatMap((d) =>
        d.participationId && d.stage !== "abandoned" ? [d.participationId] : [],
      ),
    ),
  );
}
