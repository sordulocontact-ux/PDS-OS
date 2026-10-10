// Production: where a deliverable stands on its way to « Livré » (ticket
// « Workflow Production complet », § 20 and « Livraison » : Non prête →
// Version validée → Exports à contrôler → Conforme → Livrée). Computed by
// code from the recorded decisions, never stored. Client-safe.

export type ProductionDeliveryRow = {
  // The export link; null when the delivery rests on a validated version.
  finalUrl: string | null;
  finalNote: string | null;
  approvedAt: string | null;
  checkedAt: string | null;
  deliveredAt: string | null;
};

export const DELIVERY_STATES = [
  "no_file",
  "to_approve",
  "to_check",
  "to_deliver",
  "delivered",
] as const;
export type DeliveryState = (typeof DELIVERY_STATES)[number];

export function deliveryStateOf(
  row: ProductionDeliveryRow | null,
): DeliveryState {
  if (!row) return "no_file";
  if (row.deliveredAt) return "delivered";
  if (row.checkedAt) return "to_deliver";
  if (row.approvedAt) return "to_check";
  return "to_approve";
}

/** The decision that comes next, and who takes it (`approve`: the owner or
 * a creative director; the others: the owner). */
export function nextStep(
  state: DeliveryState,
): "approve" | "check" | "deliver" | null {
  return state === "to_approve"
    ? "approve"
    : state === "to_check"
      ? "check"
      : state === "to_deliver"
        ? "deliver"
        : null;
}

export function isHttpsLink(value: string): boolean {
  return /^https:\/\/\S+$/.test(value.trim());
}
