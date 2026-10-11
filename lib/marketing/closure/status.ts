// Where the Marketing stands as a whole (ticket « Suivi & bilan », « Volet
// Marketing »): Non démarré → En cours → Bilan en préparation → Bilan
// provisoire approuvé → Clôture en préparation → Clôturé avec réserves /
// sans réserve → Réouvert. Computed from its data, never stored; it never
// says anything about the whole project's closing. Pure, client-safe.

export const CLOSURE_STATES = [
  "requested",
  "closed_clean",
  "closed_with_reserves",
  "changes_requested",
  "postponed",
  "reopened",
] as const;
export type ClosureState = (typeof CLOSURE_STATES)[number];

export const isClosureState = (v: unknown): v is ClosureState =>
  (CLOSURE_STATES as readonly unknown[]).includes(v);

export const CLOSURE_DECISIONS = [
  "closed_clean",
  "closed_with_reserves",
  "changes_requested",
  "postponed",
] as const;
export type ClosureDecision = (typeof CLOSURE_DECISIONS)[number];

export type MarketingStatus =
  | "not_started"
  | "in_progress"
  | "review_preparing"
  | "provisional_approved"
  | "closure_preparing"
  | "closed_with_reserves"
  | "closed_clean"
  | "reopened";

export function marketingStatus(facts: {
  activations: number;
  reports: { state: string }[];
  // Newest first.
  closures: { state: ClosureState }[];
}): MarketingStatus {
  const active = facts.closures.find(
    (c) =>
      c.state === "requested" ||
      c.state === "closed_clean" ||
      c.state === "closed_with_reserves",
  );
  if (active?.state === "closed_clean") return "closed_clean";
  if (active?.state === "closed_with_reserves") return "closed_with_reserves";
  if (active?.state === "requested") return "closure_preparing";
  if (facts.closures[0]?.state === "reopened") return "reopened";
  if (
    facts.reports.some(
      (r) => r.state === "approved_provisional" || r.state === "finalized",
    )
  )
    return "provisional_approved";
  if (facts.reports.length > 0) return "review_preparing";
  return facts.activations > 0 ? "in_progress" : "not_started";
}

export const isMarketingClosed = (status: MarketingStatus) =>
  status === "closed_clean" || status === "closed_with_reserves";
