// « Pas d'accord nécessaire » says which agreement already covers the
// person's rights, or why their contribution opens none (JUR-12): a payment
// alone assigns no right, so « déjà payé » is refused. Client-safe, pure;
// the server checks it again.

const PAID = /\b(pay|réglé|facturé|rémunéré|défrayé)/i;
const COVERED =
  /(contrat|cession|accord|licence|convention|aucun droit|n'ouvre|n’ouvre|libre de droits)/i;

/** True when the reason only says the person was paid. */
export function isOnlyPaid(reason: string): boolean {
  return PAID.test(reason) && !COVERED.test(reason);
}
