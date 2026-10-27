// How a committed deliverable is named everywhere (Stratégie, Conception):
// its title, with its quantity when there is more than one. Client-safe.

import { strategyDeliverables } from "@/lib/i18n/fr/strategy-deliverables";

const fr = { strategyDeliverables };

export function deliverableTitle(
  title: string,
  quantity: number | null,
): string {
  return quantity !== null && quantity > 1
    ? fr.strategyDeliverables.withQuantity(title, quantity)
    : title;
}
