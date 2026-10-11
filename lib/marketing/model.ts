// The activations and their evidence as the review reads them (ticket « Suivi
// & bilan », lot 1; supabase/migrations/20261011000601_marketing_review_sources.sql):
// the views marketing_review_activations and marketing_review_evidence group
// the Activations' own records (lib/activations/). Pure, client-safe.

export const ACTIVATION_KINDS = [
  "content",
  "influence",
  "press",
  "event",
  "other",
] as const;
export type ActivationKind = (typeof ACTIVATION_KINDS)[number];

export const ACTIVATION_STATUSES = [
  "planned",
  "in_progress",
  "done",
  "cancelled",
] as const;
export type ActivationStatus = (typeof ACTIVATION_STATUSES)[number];

export const EVIDENCE_KINDS = ["publication", "coverage", "statistic"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

// Declared: no check yet. To verify: the last check contested it or found it
// unreachable. Verified: the last check verified it (who and when kept).
export const VERIFICATIONS = ["declared", "to_verify", "verified"] as const;
export type Verification = (typeof VERIFICATIONS)[number];

// A statistic only: an unavailable figure has no value, never a zero.
export const AVAILABILITIES = ["available", "partial", "unavailable"] as const;
export type Availability = (typeof AVAILABILITIES)[number];

export type Activation = {
  id: string;
  title: string;
  kind: ActivationKind;
  status: ActivationStatus;
  ownerPersonId: string | null;
  ownerName: string | null;
  deliverableId: string | null;
  deliverableTitle: string | null;
  leverId: string | null;
  leverLabel: string | null;
  startsOn: string | null;
  endsOn: string | null;
  note: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type Evidence = {
  id: string;
  activationId: string;
  kind: EvidenceKind;
  label: string;
  url: string | null;
  platform: string | null;
  metric: string | null;
  value: number | null;
  // A statistic's unit: count, percent (never added up) or eur.
  unit: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  availability: Availability | null;
  reportedBy: string | null;
  observedOn: string | null;
  verification: Verification;
  verifiedAt: string | null;
  verifiedByName: string | null;
  linkUnreachableAt: string | null;
  archivedAt: string | null;
  // Date d'import: when it was entered in PDS OS.
  createdAt: string;
};

export const isActivationKind = (v: unknown): v is ActivationKind =>
  (ACTIVATION_KINDS as readonly unknown[]).includes(v);
export const isActivationStatus = (v: unknown): v is ActivationStatus =>
  (ACTIVATION_STATUSES as readonly unknown[]).includes(v);
export const isEvidenceKind = (v: unknown): v is EvidenceKind =>
  (EVIDENCE_KINDS as readonly unknown[]).includes(v);
export const isVerification = (v: unknown): v is Verification =>
  (VERIFICATIONS as readonly unknown[]).includes(v);
export const isAvailability = (v: unknown): v is Availability =>
  (AVAILABILITIES as readonly unknown[]).includes(v);
