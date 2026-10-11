// A Marketing reserve's arbitration (ticket « Suivi & bilan », écran 4;
// supabase/migrations/20261011000401_marketing_reserve_arbitration.sql): the
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

/** The state a reserve shows: its decision once arbitrated. */
export const reserveStateKey = (
  status: ReserveStatus,
  decision: ReserveDecision | null,
): string => (status === "arbitrated" && decision ? decision : status);
