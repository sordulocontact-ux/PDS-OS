// What a move of the calendar (Trésorerie's « Calendrier financier », the
// Planning) opens in Finance's side sheet: the spend's or the income's own
// sheet, or, for a move no single record stands behind (an engine's, the
// spends paid that day), a short sheet with the link to its page. Client-safe.
import { routes } from "@/lib/auth/redirects";
import type { TreasuryEvent } from "@/lib/finance/treasury";

export type MoveTarget =
  | { kind: "spend" | "income"; id: string }
  | { kind: "link"; where: "spends" | "fundings"; href: string };

export const fundingsTarget = (): MoveTarget => ({
  kind: "link",
  where: "fundings",
  href: routes.financeFundings,
});

/** The sheet a forecast event opens. */
export function targetOfEvent(source: TreasuryEvent["source"]): MoveTarget {
  if (source.kind === "income") return { kind: "income", id: source.id };
  if (source.kind === "spend") return { kind: "spend", id: source.id };
  return fundingsTarget();
}
