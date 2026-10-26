// A Marketing reserve's arbitration (ticket « Suivi & bilan », écran 4;
// supabase/migrations/20261011000901_marketing_reserve_arbitration.sql): the
// same lists as the SQL checks. Pure, client-safe.

export const RESERVE_STATUSES = [
  "open",
  "arbitrated",
  "lifted",
  "closed",
] as const;
export type ReserveStatus = (typeof RESERVE_STATUSES)[number];

export const RESERVE_DECISIONS = [
  "blocking",
  "follow_up",
  "accepted_limit",
  "not_applicable",
  "duplicate",
] as const;
export type ReserveDecision = (typeof RESERVE_DECISIONS)[number];

export const isReserveStatus = (v: unknown): v is ReserveStatus =>
  (RESERVE_STATUSES as readonly unknown[]).includes(v);
export const isReserveDecision = (v: unknown): v is ReserveDecision =>
  (RESERVE_DECISIONS as readonly unknown[]).includes(v);

/** The decisions a viewer may take on a reserve: the owner arbitrates, the
 * direction accepts a definitive limit; the reserve of an activation still
 * open is never « Non applicable » nor « Doublon » (recette of 23/10,
 * MKT-BIL-001; SQL arbitrate_marketing_reserve). */
export function reserveDecisionsFor(role: {
  owner: boolean;
  direction: boolean;
  activationOpen: boolean;
}): ReserveDecision[] {
  return [
    ...(role.owner
      ? (["blocking", "follow_up", "not_applicable", "duplicate"] as const)
      : []),
    ...(role.direction ? (["accepted_limit"] as const) : []),
  ].filter(
    (d) =>
      !role.activationOpen || (d !== "not_applicable" && d !== "duplicate"),
  );
}

/** The state a reserve shows: its decision once arbitrated. */
export const reserveStateKey = (
  status: ReserveStatus,
  decision: ReserveDecision | null,
): string => (status === "arbitrated" && decision ? decision : status);
