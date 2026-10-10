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

/** A deliverable on its way to « Livré » (lib/production/rules.ts). */
export const productionDeliveryTone: Record<
  "no_file" | "to_approve" | "to_check" | "to_deliver" | "delivered",
  Tone
> = {
  no_file: "neutral",
  to_approve: "warning",
  to_check: "info",
  to_deliver: "info",
  delivered: "success",
};

/** A release before its distributor: blocked, ready to leave, delivered. */
export const releaseDeliveryTone: Record<
  "not_ready" | "ready" | "delivered",
  Tone
> = {
  not_ready: "warning",
  ready: "info",
  delivered: "success",
};
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
  mix: "info",
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
  // A quote waits for someone's decision (accept it or not).
  proposed: "warning",
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

/** A fact of a workflow's first step (lib/facts/types.ts: Juridique, Master),
 * toned like the Cadrage's steps: absent is nothing yet (not a block),
 * present but unsettled waits for a check, settled is done. */
export const factTone: Record<string, Tone> = {
  known: "success",
  to_confirm: "warning",
  missing: "neutral",
};

/** A dimension of the Stratégie's pilotage (lib/strategy/dimensions.ts):
 * nothing yet, started, a proposal or choice waiting for a decision, done. */
export const strategyDimensionTone: Record<string, Tone> = {
  to_complete: "neutral",
  in_progress: "info",
  to_decide: "warning",
  complete: "success",
};

/** An action of the Juridique's plan (ticket Juridique 07's item states):
 * to act on, waiting for someone outside, held by another action, done or
 * no longer needed. */
export const planItemTone: Record<string, Tone> = {
  action_now: "action",
  waiting_external: "info",
  blocked: "neutral",
  done: "success",
  obsolete: "neutral",
};

/** A fiche de renseignements (Juridique 02): nothing yet, a link to send,
 * waiting for the person, answers to review, complete, or a dead link. */
export const legalFormTone: Record<string, Tone> = {
  none: "neutral",
  link_generated: "action",
  sent: "info",
  action_required: "warning",
  complete: "success",
  expired: "warning",
  revoked: "neutral",
};

/** An agreement of the Juridique (branch 03), from the mapping to the
 * signature: to settle, information missing, to act on, waiting, done. */
export const agreementTone: Record<string, Tone> = {
  unmapped: "action",
  not_needed: "neutral",
  needs_info: "warning",
  ready_to_generate: "action",
  draft: "action",
  review_required: "info",
  ready_for_signature: "action",
  signature_pending: "info",
  signed: "success",
  ended: "neutral",
};

/** A version of a split sheet (Juridique 04): being written, sent, partly
 * or fully confirmed, disputed, replaced. */
export const splitVersionTone: Record<string, Tone> = {
  draft: "action",
  proposed: "info",
  partially_confirmed: "info",
  confirmed: "success",
  disputed: "danger",
  superseded: "neutral",
};

/** One person's answer to a split version. */
export const splitConfirmationTone: Record<string, Tone> = {
  none: "neutral",
  pending: "info",
  confirmed: "success",
  disputed: "danger",
  revoked: "neutral",
  expired: "warning",
};

/** A clearance (Juridique 05): to investigate, on its way, secured, refused,
 * dropped, or an action awaited. */
export const clearanceTone: Record<string, Tone> = {
  to_investigate: "action",
  rightsholders_identified: "info",
  contacted: "info",
  waiting_external: "info",
  negotiating: "info",
  agreement_reached: "info",
  document_pending: "info",
  signed: "info",
  cleared: "success",
  refused: "danger",
  abandoned: "neutral",
  action_required: "warning",
};

/** A formality (Juridique 06): data to gather, ready, signing, submitted
 * (not registered), registered, or a correction asked. */
export const formalityTone: Record<string, Tone> = {
  collecting_data: "action",
  ready_to_generate: "action",
  document_ready: "info",
  signatures_pending: "info",
  ready_to_submit: "action",
  submitted: "info",
  processing: "info",
  completed: "success",
  action_required: "warning",
};

/** A contract template: to validate, in use, retired. */
export const templateStatusTone: Record<string, Tone> = {
  draft: "warning",
  validated: "success",
  retired: "neutral",
};

/** A sending of the Master's package (lib/master-workflow/transmission-types.ts):
 * received is done, waiting is in progress, without an answer it waits for
 * a reminder, an expired link is a failure, a replaced one is history. */
export const transmissionStateTone: Record<string, Tone> = {
  received: "success",
  waiting: "info",
  to_remind: "warning",
  expired: "danger",
  replaced: "neutral",
};

/** A version of the mix (lib/master-workflow/mix-types.ts): the team's
 * feedback awaited, then sent to the engineer. */
export const mixVersionTone: Record<string, Tone> = {
  received: "warning",
  feedback_sent: "info",
};

/** A question of the Brief Mix/Master (lib/master-workflow/question-types.ts):
 * awaited from the person asked, answered, then in the brief. */
export const briefQuestionTone: Record<string, Tone> = {
  open: "warning",
  answered: "info",
  applied: "success",
  done: "success",
};

/** An item of the master's file (overview checklist). */
export const checklistTone = (done: boolean): Tone =>
  done ? "success" : "warning";

/** State of a contract (lib/contracts/types.ts): being prepared, waiting for
 * the director, to be signed, signed, past its end date, terminated. */
export const contractStateTone: Record<string, Tone> = {
  draft: "neutral",
  in_review: "warning",
  approved: "action",
  sent: "info",
  signed: "success",
  expired: "neutral",
  terminated: "neutral",
};

/** A version of the Brief de cadrage (framing_briefs.state): waiting for the
 * validator, validated, sent back for a change, replaced by a newer one. */
export const briefVersionTone: Record<string, Tone> = {
  pending: "warning",
  sent: "warning",
  approved: "success",
  changes_requested: "danger",
  superseded: "neutral",
};

/** A workflow of the Plan du Projet: started, waiting for its go, or
 * following its own stage (Conception, Livraison). */
export const planWorkflowTone: Record<string, Tone> = {
  launched: "info",
  waiting: "neutral",
  follows: "neutral",
};

// Common status of a workflow (ticket « Architecture globale » § 8,
// lib/workflow-status/rules.ts): running is info, waiting for someone is a
// warning, blocked is danger, finished is success. No violet (§ 12).
export const workflowStatusTone: Record<string, Tone> = {
  not_started: "neutral",
  in_progress: "info",
  waiting: "warning",
  blocked: "danger",
  done: "success",
};

// What one workflow expects from another (lib/workflow-status/rules.ts):
// available is success, running info, waiting warning, blocked danger.
export const dependencyTone: Record<string, Tone> = {
  ready: "success",
  in_progress: "info",
  waiting: "warning",
  blocked: "danger",
};
