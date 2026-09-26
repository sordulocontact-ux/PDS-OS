/**
 * The three state treatments of docs/DESIGN.md § 1, applied to every business
 * state in one place. blocked = full ink (a block, an overrun, a refusal);
 * normal = soft grey (running or done); pending = empty outline (waiting, to come).
 * No colour: states differ by contrast only, and the label always carries the meaning.
 */
export type Treatment = "blocked" | "normal" | "pending";

export const stageTreatment: Record<string, Treatment> = {
  not_started: "pending",
  in_progress: "normal",
  awaiting_validation: "pending",
  validated: "normal",
};

export const callStatusTreatment: Record<string, Treatment> = {
  draft: "pending",
  uploaded: "pending",
  transcribing: "normal",
  transcribed: "normal",
  extracting: "normal",
  ready: "normal",
  failed: "blocked",
};

export const consentTreatment: Record<string, Treatment> = {
  pending: "pending",
  granted: "normal",
  refused: "blocked",
};

export const membershipTreatment: Record<string, Treatment> = {
  pending: "pending",
  approved: "normal",
  rejected: "blocked",
  suspended: "blocked",
};

/** Values suggested by PO: proposed waits for a person, rejected is refused. */
export const reviewTreatment: Record<string, Treatment> = {
  proposed: "pending",
  confirmed: "normal",
  rejected: "blocked",
};

/** "Identifier un besoin n'engage rien": identified waits, committed runs. */
export const needTreatment: Record<string, Treatment> = {
  identified: "pending",
  committed: "normal",
};

export const onlineTreatment = (online: boolean): Treatment =>
  online ? "normal" : "pending";
export const overdueTreatment: Treatment = "blocked";
