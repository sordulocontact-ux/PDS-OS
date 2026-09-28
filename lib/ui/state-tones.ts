/**
 * Semantic tones of docs/DESIGN.md § 3, applied to every business state in one
 * place. neutral = nothing to do yet or settled aside; info = running;
 * warning = waiting for someone's action; success = done or online;
 * danger = blocked, refused or failed. The label always carries the meaning:
 * colour only reinforces it.
 */
export type Tone =
  "neutral" | "info" | "warning" | "success" | "danger" | "action";

export const stageTone: Record<string, Tone> = {
  not_started: "neutral",
  in_progress: "info",
  awaiting_validation: "action",
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

/** A draft of the new project form, listed with the projects: nothing yet. */
export const draftTone: Tone = "neutral";

/** A project whose every stage is validated. */
export const doneTone: Tone = "success";

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

/** A validation request waits for its validator, then is settled. */
export const validationTone: Record<string, Tone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

/** A point of the Framing's guided review (lib/framing/guide.ts). */
export const framingStepTone: Record<string, Tone> = {
  empty: "neutral",
  to_review: "warning",
  confirmed: "success",
};

/** "Identifier un besoin n'engage rien": identified is neutral, committed runs. */
export const needTone: Record<string, Tone> = {
  identified: "neutral",
  committed: "info",
};

export const onlineTone = (online: boolean): Tone =>
  online ? "success" : "neutral";
export const overdueTone: Tone = "danger";

/**
 * A validation waiting for the signed-in person specifically (their own
 * "Validations qui m'attendent" card): more visible than warning, which
 * covers everything waiting on someone else in general.
 */
export const myValidationTone: Tone = "action";

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

/**
 * How far a title has come: a demo is not work to do (neutral), a rough mix
 * or a master runs toward the final master, which is done.
 */
export const audioStateTone: Record<string, Tone> = {
  demo: "neutral",
  rough_mix: "info",
  master: "info",
  final_master: "success",
};

/** Work of a person in a project (lib/project-work): late blocks, to do runs,
 * waiting on someone else, done. */
export const workStatusTone: Record<string, Tone> = {
  overdue: "danger",
  todo: "info",
  waiting: "warning",
  done: "success",
};

/** A committed deliverable, computed by code: late blocks, unstaffed waits. */
export const deliverableStateTone: Record<string, Tone> = {
  overdue: "danger",
  to_staff: "warning",
  planned: "info",
};

/** Budget line: planned is only an intention, committed runs, paid is settled. */
export const budgetStatusTone: Record<string, Tone> = {
  planned: "neutral",
  committed: "info",
  paid: "success",
};

/** Design state of a deliverable (lib/design/rules.ts): nothing yet, waiting
 * for the owner's review, sent back for changes, approved. */
export const designStateTone: Record<string, Tone> = {
  to_design: "neutral",
  submitted: "warning",
  changes_requested: "danger",
  approved: "success",
};

/** Kind of a feedback about the app: a bug blocks someone, an idea is ahead. */
export const feedbackKindTone: Record<string, Tone> = {
  bug: "danger",
  idea: "info",
  other: "neutral",
};

/** Priority of a project; only "high" is shown, as a badge in the lists
 * (same tones as a feedback's priority). */
export const projectPriorityTone: Record<string, Tone> = {
  high: "danger",
  normal: "info",
  low: "neutral",
};

/** Priority the director gives a feedback topic when sending it. */
export const feedbackPriorityTone: Record<string, Tone> = {
  high: "danger",
  normal: "info",
  low: "neutral",
};

/** Declaration of a master to a collecting society: still to file waits for
 * the team, filed waits for the organism, then confirmed or refused. */
export const declarationStatusTone: Record<string, Tone> = {
  todo: "warning",
  submitted: "info",
  confirmed: "success",
  rejected: "danger",
};

/** Shares of a kind of split (splitTotal): complete at 100 %, else to do. */
export const splitStatusTone: Record<string, Tone> = {
  empty: "warning",
  incomplete: "warning",
  complete: "success",
};

/** An item of the master's file (overview checklist). */
export const checklistTone = (done: boolean): Tone =>
  done ? "success" : "warning";
