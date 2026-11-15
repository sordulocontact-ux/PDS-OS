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

/** A project's administrative status in the list (PROJ-UX-01), apart from
 * its phase: the handover's tones, then running and done. */
export const adminStatusTone: Record<string, Tone> = {
  draft: "neutral",
  not_transmitted: "neutral",
  pending: "warning",
  clarification_requested: "warning",
  refused: "danger",
  running: "info",
  done: "success",
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
  closed: "neutral",
};

/** A call's block in the Calls calendar: a call left to record stands out
 * (proto `docs/protos/pages.html`, legend « À enregistrer »). */
export const callCalendarTone: Record<string, Tone> = {
  ...callStatusTone,
  draft: "warning",
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

/**
 * How sure the code judges a draft of PO (MKT-S1-09): a low one asks to be
 * read again; never the green of a confirmed value.
 */
export const draftConfidenceTone: Record<string, Tone> = {
  high: "info",
  medium: "neutral",
  low: "warning",
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
  // Invoiced: a bill to pay.
  invoiced: "action",
  paid: "success",
};

// A poste or an artist's envelope (BUD 2): spent beyond what it was given,
// signalled, never blocking.
export const envelopeTone: Record<"within" | "over", Tone> = {
  within: "neutral",
  over: "danger",
};

/** Money coming in (Finance, lib/finance/money-in.ts): awaited, invoiced
 * and running, late as an overdue invoice, received, cancelled aside. */
export const incomeStateTone: Record<
  | "expected"
  | "draft"
  | "sent"
  | "late"
  | "partial"
  | "received"
  | "credited"
  | "cancelled",
  Tone
> = {
  expected: "neutral",
  draft: "neutral",
  sent: "info",
  late: overdueTone,
  partial: "info",
  received: "success",
  credited: "neutral",
  cancelled: "neutral",
};

/** A spend still to pay in the treasury's calendar (budget_lines.status):
 * estimated or quoted, engaged, invoiced. */
export const spendCashTone: Record<
  "planned" | "proposed" | "committed" | "invoiced" | "paid",
  Tone
> = {
  planned: "neutral",
  proposed: "warning",
  committed: "info",
  invoiced: "info",
  paid: "success",
};

/** Design state of a deliverable (lib/design/rules.ts): nothing yet, waiting
 * for the owner's review, sent back for changes, approved. */
export const designStateTone: Record<string, Tone> = {
  to_design: "neutral",
  submitted: "warning",
  // A normal return of the review, not an error: warning (Sacha, 10/11/2026).
  changes_requested: "warning",
  approved: "success",
  discarded: "neutral",
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
  to_verify: "neutral",
  to_do: "warning",
  submitted: "info",
  confirmed: "success",
  to_correct: "warning",
  rejected: "danger",
  not_applicable: "neutral",
};

/** Where an audio version stands (retours Catalogue 13, 18): decided, or
 * waiting (the latest of its step), or left for a newer one. */
export const audioValidationTone: Record<string, Tone> = {
  approved: "success",
  changes_requested: "warning",
  pending: "action",
  superseded: "neutral",
};

/** A split's validation, apart from its total (retours Catalogue 44, 46). */
export const splitReviewTone: Record<string, Tone> = {
  preparing: "neutral",
  to_check: "warning",
  validated: "success",
  changed: "warning",
};

/** A title's distribution, apart from its audio state (retour Catalogue 01). */
export const titleDistributionTone: Record<string, Tone> = {
  not_prepared: "neutral",
  preparing: "info",
  delivered: "warning",
  available: "success",
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
/** A request for clarification of a transmission (PROJ-UX-02). */
export const clarificationTone: Record<string, Tone> = {
  answered: "success",
  waiting: "warning",
  retransmitted: "neutral",
};

/** What a legal party of the Cadrage needs, decided by a person (PROJ-BUG-03). */
export const partyStatusTone: Record<string, Tone> = {
  existing: "success",
  to_verify: "warning",
  to_prepare: "action",
  not_needed: "neutral",
  not_applicable: "neutral",
};

export const factTone: Record<string, Tone> = {
  known: "success",
  to_confirm: "info",
  missing: "warning",
};

/** A line of the Cadrage (proto FR_ST, lib/framing/lines.ts): Fait, À vérifier,
 * À faire, Non applicable, À définir plus tard. Three states everywhere
 * (Sacha 06/11/2026): a missing information is work to do (orange), not an
 * error; red stays for errors, refusals and blocks. */
export const framingLineTone: Record<string, Tone> = {
  known: "success",
  confirmed: "success",
  to_confirm: "info",
  missing: "warning",
  na: "neutral",
  later: "info",
};

/** An item of the Stratégie's follow-up before the release
 * (lib/strategy/follow-up.ts): ready, running, waiting for a decision, blocked. */
export const followUpTone: Record<string, Tone> = {
  ready: "success",
  in_progress: "info",
  waiting: "warning",
  blocked: "danger",
};

/** A version of an artist's identity (MKT-C2-04): waiting for a validator,
 * in force or past, refused. */
export const identityStatusTone: Record<string, Tone> = {
  proposed: "warning",
  approved: "success",
  rejected: "danger",
};

/** A step of the Conception's journey (MKT-C2-03): done, the one in
 * progress, to come, or passed over on purpose. */
export const journeyStepTone: Record<string, Tone> = {
  done: "success",
  current: "info",
  todo: "neutral",
  skipped: "neutral",
};

/** A recommendation of the follow-up (MKT-C2-02), by level: a fact to keep,
 * an action advised, a deadline threatened, a milestone that cannot happen. */
export const recommendationLevelTone: Record<string, Tone> = {
  information: "neutral",
  recommendation: "info",
  risk: "warning",
  blocking: "danger",
};

/** A dimension of the Stratégie's pilotage (lib/strategy/dimensions.ts):
 * nothing yet, started, a proposal or choice waiting for a decision, done. */
export const strategyDimensionTone: Record<string, Tone> = {
  to_complete: "warning",
  in_progress: "info",
  to_decide: "warning",
  complete: "success",
};

/** A lever of the Dispositif (proto LSTATE): retained, to arbitrate, not
 * retained. */
export const leverStateTone: Record<
  "retained" | "to_decide" | "not_retained",
  Tone
> = {
  retained: "success",
  to_decide: "warning",
  not_retained: "neutral",
};

/** A line of the Budget stratégie (proto budget()): proposed (its status
 * says the rest), to arbitrate with its lever, dropped with it. */
export const strategyBudgetLineTone: Record<
  "proposed" | "to_decide" | "dropped",
  Tone
> = {
  proposed: "neutral",
  to_decide: "warning",
  dropped: "neutral",
};

/** A question of the Conception's intentions: no confirmed answer yet, or
 * answered — the same tones as the Stratégie's dimensions. */
export const intentionTopicTone: Record<"to_complete" | "complete", Tone> = {
  to_complete: strategyDimensionTone.to_complete,
  complete: strategyDimensionTone.complete,
};

/** A version of a strategy document: ready to send, waiting for its
 * reviewers, validated, to correct, or replaced by a newer one. */
export const strategyDocumentTone: Record<string, Tone> = {
  pending: "neutral",
  sent: "action",
  approved: "success",
  changes_requested: "warning",
  superseded: "neutral",
};

/** A signal of the engineer (PROJ-AMEL-02): to handle, handled. */
export const engineerSignalTone: Record<string, Tone> = {
  open: "warning",
  // A delay sent to the direction (proto « Chez la direction »): waiting
  // for its decision, not an error.
  escalated: "warning",
  handled: "success",
};

/** A studio session's computed state (lib/sessions/state.ts): few colours
 * (Ibé, 06/11/2026), the report to write stands out. */
export const sessionStateTone: Record<string, Tone> = {
  planned: "info",
  ongoing: "info",
  toReport: "action",
  done: "neutral",
  cancelled: "neutral",
};

/** A working file of a title (retour 36): provisional or final. */
export const workStatusFileTone: Record<string, Tone> = {
  provisional: "warning",
  final: "success",
};

/** A value of a contract to generate (JUR-16): an invalid one in red; a
 * missing one is still to fill, not an error (Sacha, 10/11/2026). */
export const contractValueTone: Record<string, Tone> = {
  filled: "success",
  unconfirmed: "warning",
  not_applicable: "neutral",
  waiting: "info",
  invalid: "danger",
  missing: "warning",
};

/** An item of the Brief between two versions (MKT-S1-16). */
export const briefChangeTone: Record<string, Tone> = {
  added: "success",
  removed: "danger",
  changed: "info",
};

/** A reserve put on a validated Brief (MKT-S1-16): to lift, or lifted. */
export const strategyReserveTone: Record<string, Tone> = {
  open: "warning",
  lifted: "success",
};

/** A validator of the Brief de sortie in its step (proto st3): waiting
 * (info), validated, with reserves, a change asked (warning), the round
 * ended before they answered. */
export const strategyBriefReviewTone: Record<
  "pending" | "approved" | "reserves" | "changes" | "cancelled",
  Tone
> = {
  pending: "info",
  approved: "success",
  reserves: "success",
  changes: "warning",
  cancelled: "neutral",
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
  rejected: "danger",
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
  revoked: "neutral",
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
  pending: "neutral",
  // Proto « Projet complet » (frBrief): in review = info, a change = warning.
  sent: "info",
  approved: "success",
  changes_requested: "warning",
  superseded: "neutral",
};

/** A request on the Brief (PROJ-UX-06): open asks for work, a correction or
 * a withdrawal closes it, a justification closes it without change. */
export const briefRequestTone: Record<string, Tone> = {
  open: "warning",
  modified: "success",
  justified: "neutral",
  withdrawn: "neutral",
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

/** A deliverable of the Conception: engaged by the Stratégie, or added late
 * and still to qualify (neither validated nor planned). */
export const conceptionDeliverableTone: Record<string, Tone> = {
  confirmed: "success",
  to_qualify: "warning",
};

/** Who holds a production position (production_assignments.availability):
 * waiting for an answer, confirmed available, unavailable. Set by a person,
 * never by PO. */
export const productionAvailabilityTone: Record<string, Tone> = {
  to_confirm: "warning",
  available: "success",
  unavailable: "danger",
};

/** The Conception as a whole (lib/design/states.ts). */
export const conceptionStateTone: Record<string, Tone> = {
  not_started: "neutral",
  in_progress: "info",
  to_arbitrate: "warning",
  partially_validated: "action",
  done: "success",
};

/** The consolidated intentions of a target: nothing yet, to confirm by the
 * owner, confirmed, or changed since their confirmation. */
export const intentionsStateTone: Record<string, Tone> = {
  draft: "neutral",
  to_confirm: "info",
  confirmed: "success",
  to_revise: "warning",
};

/** The artistic direction and a Fiche Livrable on their way to validation;
 * a decision of a validator. */
export const designReviewTone: Record<string, Tone> = {
  to_assign: "warning",
  in_preparation: "info",
  draft: "neutral",
  to_complete: "info",
  ready: "action",
  pending: "warning",
  approved: "success",
  ready_for_production: "success",
  transferred: "success",
  changes_requested: "warning",
  rejected: "danger",
  withdrawn: "neutral",
};

// Production of a deliverable (lib/production/phase.ts).
export const productionPhaseTone: Record<string, Tone> = {
  to_prepare: "neutral",
  preproduction: "info",
  ready: "info",
  shooting: "warning",
  shot: "info",
  post: "info",
  final_check: "warning",
  delivered: "success",
  handed_off: "success",
};

/** A reference of the Conception: a proposal until a validated section of
 * the artistic direction carries it (lib/design/reference-status.ts). */
export const referenceStatusTone: Record<string, Tone> = {
  proposed: "neutral",
  validated: "success",
};

/** One of the three decisions before « Livré » (lib/production/delivery/rules.ts):
 * blocked = an expected file is not conforming. */
export const deliveryDecisionTone: Record<
  "done" | "to_do" | "blocked" | "waiting",
  Tone
> = {
  done: "success",
  to_do: "warning",
  blocked: "danger",
  waiting: "neutral",
};

/** A line of the exports' technical check; stale = checked before the
 * current validated version or final file. */
export const exportCheckTone: Record<
  "to_check" | "ok" | "not_ok" | "stale",
  Tone
> = {
  to_check: "warning",
  ok: "success",
  not_ok: "danger",
  stale: "warning",
};

/** A transmission to Activations: matches the delivery, overtaken by it
 * (stale), or replaced by a later one. */
export const activationHandoffTone: Record<
  "current" | "stale" | "earlier",
  Tone
> = {
  current: "success",
  stale: "warning",
  earlier: "neutral",
};

/** The shoot of a deliverable (lib/production/shoot/rules.ts). */
export const shootStateTone: Record<string, Tone> = {
  planned: "neutral",
  in_progress: "info",
  done: "success",
  partial: "warning",
  postponed: "neutral",
  interrupted: "danger",
};

/** A declaration of the shoot (rushes, audio sources, backup): a person's
 * word, never a check of the files. */
export const shootDeclarationTone = (declared: boolean): Tone =>
  declared ? "success" : "warning";

/** An incident of the shoot: open until a person writes its resolution. */
export const shootIncidentTone: Record<string, Tone> = {
  open: "warning",
  resolved: "success",
};

/** A confirmed equipment line on its way back (production_equipment). */
export const equipmentReturnTone: Record<string, Tone> = {
  booked: "neutral",
  picked_up: "info",
  to_return: "warning",
  returned: "success",
  incident: "danger",
};

/** The equipment's return as a whole, computed from its confirmed lines. */
export const returnStateTone: Record<string, Tone> = {
  none: "neutral",
  to_return: "warning",
  partial: "warning",
  all_returned: "success",
  incident: "danger",
};

/** The shoot report: not yet possible, to validate by the owner, validated. */
export const shootReportTone: Record<string, Tone> = {
  not_ended: "neutral",
  to_validate: "action",
  validated: "success",
};

/** A step of the postproduction (lib/production/post/rules.ts). */
export const postStepTone: Record<string, Tone> = {
  todo: "neutral",
  in_progress: "info",
  done: "success",
};

/** A version of the postproduction: a draft, under review, back to the
 * provider, waiting for the validator's decision, validated or refused. */
export const productionVersionTone: Record<string, Tone> = {
  draft: "neutral",
  in_review: "info",
  changes_requested: "warning",
  final_review: "info",
  approved: "success",
  refused: "danger",
};

/** A correction request (PROD-031): a draft not sent yet waits on us. */
export const correctionRequestTone: Record<string, Tone> = {
  draft: "warning",
  sent: "info",
  viewed: "info",
  treated: "success",
};

/** A feedback on a version: a correction declared fixed waits for someone to
 * verify it, never validated on its own. */
export const versionCommentTone: Record<string, Tone> = {
  open: "warning",
  acknowledged: "info",
  declared_fixed: "info",
  to_verify: "action",
  resolved: "success",
  rejected: "neutral",
};

// Préproduction of a deliverable (lib/production/preprod/).

/** A team brief: not transmitted, transmitted as it stands, changed since. */
export const teamBriefTone: Record<string, Tone> = {
  draft: "neutral",
  transmitted: "success",
  outdated: "warning",
};

/** A point of the technical call: PO's proposal waits for a person. */
export const callItemStatusTone: Record<string, Tone> = {
  proposed: "warning",
  confirmed: "success",
  rejected: "neutral",
};

/** An action of the preproduction plan, and the plan as a whole
 * (lib/production/preprod/plan.ts). */
export const planStateTone: Record<string, Tone> = {
  empty: "neutral",
  draft: "neutral",
  to_review: "warning",
  approved: "success",
  in_progress: "info",
  done: "success",
  blocked: "danger",
  removed: "neutral",
};

/** The shoot's location: pressenti stays distinct from confirmed. */
export const locationStatusTone: Record<string, Tone> = {
  to_find: "neutral",
  to_verify: "warning",
  confirmed: "success",
};

/** An equipment line, from the need to its return. */
export const equipmentStatusTone: Record<string, Tone> = {
  need: "neutral",
  quoted: "info",
  to_verify: "warning",
  retained: "info",
  booked: "success",
  picked_up: "info",
  to_return: "warning",
  returned: "success",
  incident: "danger",
};

/** An estimate of the preproduction budget. */
export const preprodBudgetTone: Record<string, Tone> = {
  planned: "neutral",
  to_estimate: "warning",
  estimated: "info",
  to_decide: "action",
  validated: "success",
  committed: "success",
};

/** A step of the backward schedule. */
export const scheduleStepTone: Record<string, Tone> = {
  done: "success",
  late: "danger",
  planned: "neutral",
  untracked: "neutral",
};

/** A check before the shoot, confirmed by a person. */
export const readinessTone: Record<string, Tone> = {
  confirmed: "success",
  open: "warning",
  not_required: "neutral",
};

/** Marketing › Activations (lib/activations/states.ts): the operational
 * status, set by a person; « Réalisée déclarée » waits for its proof. */
export const activationStatusTone: Record<string, Tone> = {
  to_prepare: "neutral",
  in_progress: "info",
  done_declared: "warning",
  closed: "success",
  cancelled: "neutral",
  blocked: "danger",
  suspended: "warning",
};

/** The proof of an activation, computed: only a successful check is green. */
export const proofTone: Record<string, Tone> = {
  not_expected: "neutral",
  to_provide: "warning",
  provided_unverified: "action",
  verified: "success",
  contested: "danger",
  unavailable: "danger",
};

/** The statistics of an activation: declared ones are not verified ones. */
export const measureTone: Record<string, Tone> = {
  not_expected: "neutral",
  to_collect: "warning",
  partial: "warning",
  available_declared: "action",
  available_verified: "success",
  unavailable: "neutral",
};

/** A versioned sheet (framing, concept) and a message to an outside party. */
export const activationSheetTone: Record<string, Tone> = {
  draft: "neutral",
  to_validate: "action",
  validated: "success",
  changes_requested: "warning",
  refused: "danger",
};
export const activationMessageTone: Record<string, Tone> = {
  draft: "neutral",
  to_validate: "action",
  validated: "info",
  sent_declared: "success",
  cancelled: "neutral",
};

/** A blocker's severity, an alert's. */
export const severityTone: Record<string, Tone> = {
  low: "neutral",
  medium: "warning",
  high: "danger",
};

/** An influence collaboration's step (lib/activations/influence/stage.ts). */
export const collaborationStageTone: Record<string, Tone> = {
  candidate: "neutral",
  concept_to_validate: "action",
  validated_internal: "info",
  to_contact: "info",
  negotiation: "info",
  agreement_to_obtain: "warning",
  agreed: "info",
  content_in_progress: "info",
  in_validation: "action",
  ready_to_publish: "info",
  published_declared: "warning",
  published_verified: "success",
  administration: "warning",
  closed: "success",
  refused: "neutral",
  no_response: "neutral",
  abandoned: "neutral",
  cancelled: "neutral",
  dispute: "danger",
  declined: "neutral",
};

/** Where the Distribution preparation stands (lib/distribution/readiness.ts):
 * ready for the checks is not a validation, so never green. */
export const distributionPreparationTone: Record<
  "to_prepare" | "partial" | "ready",
  Tone
> = {
  to_prepare: "neutral",
  partial: "warning",
  ready: "info",
};

/** An element the Distribution reuses (lib/distribution/readiness.ts):
 * validated at its source, present in a module without validation, present
 * but not validated, missing (danger only when it blocks the dossier), or
 * closed to the viewer. */
export const distributionSourceTone = (
  state:
    | "validated"
    | "available"
    | "unvalidated"
    | "missing"
    | "restricted"
    | "later",
  blocking: boolean,
): Tone =>
  state === "validated"
    ? "success"
    : state === "available" || state === "later"
      ? "neutral"
      : state === "unvalidated"
        ? "warning"
        : state === "missing"
          ? blocking
            ? "danger"
            : "warning"
          : "neutral";

// Marketing › Suivi & bilan: an activation as the review groups it
// (marketing_review_activations: planned, running, done or set aside); an
// evidence declared (nothing checked yet), to verify (contested or
// unreachable), verified (a person checked).
export const reviewActivationStatusTone: Record<string, Tone> = {
  planned: "neutral",
  in_progress: "info",
  done: "success",
  cancelled: "neutral",
};

export const evidenceVerificationTone: Record<string, Tone> = {
  declared: "neutral",
  to_verify: "warning",
  verified: "success",
};

// A statistic: a partial figure is waited on, an unavailable one is a gap.
export const evidenceAvailabilityTone: Record<string, Tone> = {
  available: "neutral",
  partial: "warning",
  unavailable: "danger",
};

/** A Distribution check recorded by a person (lib/distribution/checks.ts):
 * « conforme » only once someone checked; never by the code alone. */
export const distributionCheckTone: Record<
  "unchecked" | "compliant" | "non_compliant" | "not_applicable",
  Tone
> = {
  unchecked: "warning",
  compliant: "success",
  non_compliant: "danger",
  not_applicable: "neutral",
};

/** The code's own reading of a check: never green (it is not a check). */
export const distributionComputedTone: Record<
  "coherent" | "gap" | "human",
  Tone
> = {
  coherent: "info",
  gap: "danger",
  human: "warning",
};

/** A version of the Distribution dossier (lib/distribution/validation.ts). */
export const distributionVersionTone: Record<
  "pending" | "approved" | "rejected" | "superseded",
  Tone
> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  superseded: "neutral",
};

/** A Distribution declaration (lib/distribution/tracking.ts): said by a
 * person, with or without a proof — never green, nothing was verified. */
export const distributionEvidenceTone: Record<
  "none" | "declared" | "proven" | "corrections",
  Tone
> = {
  none: "neutral",
  declared: "warning",
  proven: "info",
  // « Corrections demandées »: for the team to do, not a refusal.
  corrections: "warning",
};

// A Marketing report version (ticket « Suivi & bilan »): generated, waiting
// for the validator, approved as a provisional review, sent back, put off,
// replaced by a newer version, or the reference of the closing.
export const marketingReportTone: Record<string, Tone> = {
  generated: "neutral",
  to_validate: "action",
  approved_provisional: "success",
  changes_requested: "warning",
  postponed: "warning",
  superseded: "neutral",
  finalized: "success",
};

/** Public availability of a release (lib/distribution/platforms.ts): green
 * only once a person verified every platform of reference. */
export const distributionAvailabilityTone: Record<
  "not_declared" | "declared" | "partially_verified" | "verified",
  Tone
> = {
  not_declared: "neutral",
  declared: "warning",
  partially_verified: "info",
  verified: "success",
};

/** One platform as a person verified it, and its compliance. */
export const platformVerificationTone: Record<
  "unchecked" | "verified" | "unavailable",
  Tone
> = { unchecked: "warning", verified: "success", unavailable: "danger" };
export const platformComplianceTone: Record<
  "unchecked" | "compliant" | "non_compliant",
  Tone
> = { unchecked: "neutral", compliant: "success", non_compliant: "danger" };

/** A Distribution anomaly (lib/distribution/anomalies.ts): its severity and
 * where its correction stands. */
export const anomalySeverityTone: Record<"minor" | "major" | "blocking", Tone> =
  { minor: "neutral", major: "warning", blocking: "danger" };
export const anomalyStateTone: Record<
  "open" | "in_correction" | "resolved" | "dismissed",
  Tone
> = {
  open: "warning",
  in_correction: "info",
  resolved: "success",
  dismissed: "neutral",
};

// A Marketing reserve (ticket « Suivi & bilan »): to arbitrate, to lift
// before the closing, followed after it, accepted as a limit, lifted or
// closed.
export const marketingReserveTone: Record<string, Tone> = {
  open: "action",
  blocking: "danger",
  follow_up: "warning",
  accepted_limit: "neutral",
  lifted: "success",
  closed: "neutral",
};

// The Marketing as a whole (ticket « Suivi & bilan »): closed is done, a
// closing asked waits for the direction, reopened runs again.
export const marketingStatusTone: Record<string, Tone> = {
  not_started: "neutral",
  in_progress: "info",
  review_preparing: "info",
  provisional_approved: "info",
  closure_preparing: "action",
  closed_with_reserves: "success",
  closed_clean: "success",
  reopened: "warning",
};

/** A version of the Brief créatif (MKT-C2-12, lib/design/brief-status.ts). */
export const creativeBriefTone: Record<string, Tone> = {
  current: "success",
  outdated: "warning",
  superseded: "neutral",
  in_review: "action",
  validated: "success",
};

/** A proposal decided one by one (ProposalRow): waiting for a person is a
 * warning, confirmed is done, set aside is neutral (never red). */
export const proposalTone: Record<"proposed" | "kept" | "discarded", Tone> = {
  proposed: "warning",
  kept: "success",
  discarded: "neutral",
};

/** A line of a meeting's report, by what became of it in the step. */
export const meetingLineTone: Record<string, Tone> = {
  confirmed: "success",
  corrected: "success",
  discarded: "neutral",
  pending: "warning",
};

/** The summary sent to a meeting's participants. */
export const meetingSummaryTone: Tone = "success";

// A noted information (proto KIND): an information, to confirm, waiting for a
// decision, decided.
export const noteStatusTone: Record<
  "information" | "to_confirm" | "pending_decision" | "decided",
  Tone
> = {
  information: "neutral",
  to_confirm: "info",
  pending_decision: "info",
  decided: "success",
};

// « Avant la clôture » of the Marketing (proto `bi3`): Prêt, Pas prêt,
// Attention, Avec réserves.
export const reviewCheckTone: Record<
  "ready" | "not_ready" | "attention" | "with_reserves",
  Tone
> = {
  ready: "success",
  not_ready: "danger",
  attention: "warning",
  with_reserves: "neutral",
};

/** A right of a clearance (JUR-09, JUR-10): accepted is not authorised. */
export const rightStateTone: Record<string, Tone> = {
  to_identify: "action",
  to_ask: "action",
  asked: "neutral",
  terms_proposed: "warning",
  terms_accepted: "warning",
  to_sign: "warning",
  authorized: "success",
  refused: "danger",
};

/** A maquette (retour d'Ibé du 05/11/2026): validated is artistic, not a release. */
export const demoStatusTone: Record<string, Tone> = {
  draft: "neutral",
  developing: "info",
  validated: "success",
  abandoned: "neutral",
};

/** A title of a collective project (docs/pds-mic-plan.md, lot 2): planned
 * waits for nothing yet, active runs, abandoned is set aside. */
export const projectTitleTone: Record<string, Tone> = {
  planned: "neutral",
  active: "info",
  abandoned: "neutral",
};

/** A term of a deal (BIZ 3): PDS's proposal waits for the artist's side, a
 * counter-proposal waits for PDS, confirmed is settled, to define is
 * nothing yet. */
export const dealTermTone = {
  pds_proposal: "warning",
  counter_proposal: "action",
  confirmed: "success",
  to_define: "neutral",
} as const satisfies Record<string, Tone>;

/** A deal's stage (BIZ 4): running stages are info, the accord de principe
 * waits for the direction, signed is done, abandoned is set aside. */
export const dealStageTone = {
  to_contact: "neutral",
  call_planned: "info",
  negotiation: "info",
  agreement: "warning",
  contracting: "info",
  signed: "success",
  abandoned: "neutral",
} as const satisfies Record<string, Tone>;

/** A deal memo (BIZ 7): a draft waits for the direction, validated is done. */
export const dealMemoTone = {
  draft: "warning",
  validated: "success",
} as const satisfies Record<string, Tone>;

/** A term of the validated deal memo against the contract (BIZ 7): the
 * contract says the same, says otherwise, or nobody checked yet. */
export const dealCheckTone = {
  conform: "success",
  different: "danger",
  unchecked: "neutral",
} as const satisfies Record<string, Tone>;

/** A box of the Eisenhower matrix of « Mes tâches »: « Faire » presses,
 * « Déléguer » waits for someone else, « Planifier » runs, « Plus tard » is
 * set aside. */
export const quadrantTone = {
  do: "danger",
  plan: "info",
  delegate: "warning",
  later: "neutral",
} as const satisfies Record<string, Tone>;

/** A Google service of Paramètres › Connexions: branched is online, waiting
 * for the domain's authorization is a warning (someone must act), Google not
 * answering is a failure, not set yet or turned off is nothing to do. */
export const googleServiceTone = {
  connected: "success",
  not_set: "neutral",
  refused: "warning",
  unreachable: "danger",
  off: "neutral",
} as const satisfies Record<string, Tone>;
