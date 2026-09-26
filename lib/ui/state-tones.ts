/**
 * Semantic tones of docs/DESIGN.md § 3, applied to every business state in one
 * place. neutral = nothing to do yet or settled aside; info = running;
 * warning = waiting for someone's action; success = done or online;
 * danger = blocked, refused or failed. The label always carries the meaning:
 * colour only reinforces it.
 */
export type Tone = "neutral" | "info" | "warning" | "success" | "danger";

export const stageTone: Record<string, Tone> = {
  not_started: "neutral",
  in_progress: "info",
  awaiting_validation: "warning",
  validated: "success",
};

// Project handover: waiting for the project manager or for the director is a
// warning, a refusal is a block, a launched project runs.
export const projectStatusTone: Record<string, Tone> = {
  not_transmitted: "neutral",
  pending: "warning",
  refused: "danger",
  clarification_requested: "warning",
  launched: "info",
};

export const callStatusTone: Record<string, Tone> = {
  draft: "neutral",
  upcoming: "info",
  uploaded: "neutral",
  transcribing: "info",
  transcribed: "info",
  extracting: "info",
  ready: "success",
  failed: "danger",
};

export const consentTone: Record<string, Tone> = {
  pending: "warning",
  granted: "success",
  refused: "danger",
};

export const membershipTone: Record<string, Tone> = {
  invited: "warning",
  pending: "warning",
  approved: "success",
  rejected: "danger",
  suspended: "danger",
};

/** Values suggested by PO: proposed waits for a person, rejected is refused. */
export const reviewTone: Record<string, Tone> = {
  proposed: "warning",
  confirmed: "success",
  rejected: "danger",
};

/** "Identifier un besoin n'engage rien": identified is neutral, committed runs. */
export const needTone: Record<string, Tone> = {
  identified: "neutral",
  committed: "info",
};

export const onlineTone = (online: boolean): Tone =>
  online ? "success" : "neutral";
export const overdueTone: Tone = "danger";

// A release announced on Deezer but not out yet.
export const upcomingReleaseTone: Tone = "info";

/** A lever to decide waits; selected is kept; not selected is settled aside. */
export const leverTone: Record<string, Tone> = {
  to_decide: "warning",
  selected: "success",
  rejected: "neutral",
};

/** Release status of a master, computed by releaseStatusOf (lib/catalog). */
export const masterReleaseTone: Record<string, Tone> = {
  online: "success",
  planned: "info",
  undated: "neutral",
};
