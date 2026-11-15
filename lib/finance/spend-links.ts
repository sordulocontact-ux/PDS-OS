// Where a link opens Finance › Dépenses already filtered (one list since
// 15/11/2026, as the proto): the status, the envelope (« hors » for spends
// on none) or the spends without their proof. Client-safe.
import { routes } from "@/lib/auth/redirects";

export const SPEND_STATUS_SLUGS = [
  "prevu",
  "engage",
  "facture",
  "paye",
  "a-refacturer",
] as const;
export type SpendStatusSlug = (typeof SPEND_STATUS_SLUGS)[number];

export const OFF_BUDGET_SLUG = "hors";

export function spendsHref(filter: {
  statut?: SpendStatusSlug;
  enveloppe?: string;
  justificatif?: "sans";
  ouvrir?: string;
}): string {
  const query = new URLSearchParams(
    Object.entries(filter).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();
  return query ? `${routes.financeSpends}?${query}` : routes.financeSpends;
}
