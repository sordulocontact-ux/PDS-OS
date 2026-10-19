// Notification types and text. Client-safe.

import { routes } from "@/lib/auth/redirects";
import { legalDemarcheHref } from "@/lib/ui/legal-steps";
import { fr } from "@/lib/i18n/fr";
import { distributionStepHref } from "@/lib/ui/distribution-steps";
import { reviewStepHref } from "@/lib/ui/review-steps";

export const NOTIFICATION_KINDS = [
  "project_transmitted",
  "project_accepted",
  "project_refused",
  "project_clarification_requested",
  "validation_requested",
  "validation_approved",
  "validation_rejected",
  "task_assigned",
  "project_creative_added",
  "design_version_submitted",
  "design_version_approved",
  "design_version_changes_requested",
  "design_version_discarded",
  "design_submission_requested",
  "design_submission_decided",
  // A later version of a Fiche Livrable transferred: the Production is told.
  "design_sheet_new_version",
  "contract_review_requested",
  "contract_approved",
  "contract_changes_requested",
  "meeting_invited",
  "call_report_shared",
  "master_engineer_signal",
  "master_transmission_received",
  "master_mix_version_received",
  "master_mix_approved",
  "master_mix_changes_requested",
  "master_mastering_version_received",
  "master_final_approved",
  "master_mastering_changes_requested",
  // A newer version of a title whose final vocals were awaited.
  "master_source_newer",
  // A borrowing's conditions (Juridique): to validate, validated, refused.
  "clearance_terms_proposed",
  "clearance_terms_validated",
  "clearance_terms_rejected",
  // An element withdrawn from a title after a refusal: the Master redoes it.
  "legal_element_withdrawn",
  // A strategy document's review (Brief de sortie, Plan de sortie…): asked,
  // approved, a change asked, a reminder.
  "strategy_review_requested",
  "strategy_review_approved",
  "strategy_review_changes_requested",
  "strategy_review_reminder",
  // The Brief de sortie validated: the owner and the creative directors
  // (Stratégie, lot 3 of the proto « Projet complet »).
  "strategy_validated",
  // The creative team: the project launched, the Brief ready, a call.
  "project_launched",
  "brief_approved",
  "call_invited",
  // The engineer deposited a version through their link.
  "master_delivery_received",
  "master_mastering_delivery_received",
  // A fiche de renseignements came back through its link (JUR-11).
  "legal_form_received",
  // Production: a version waits for its decision; corrections are asked to
  // a member (PROD-028, PROD-031).
  "production_version_submitted",
  "production_corrections_sent",
  // A provider deposited an expected export through their link (PROD-036).
  "production_export_deposited",
  // The shoot started: the team members holding a position (PROD-018).
  "production_shoot_started",
  // A new version of the call sheet was published (PROD-016).
  "production_call_sheet_published",
  // A provider said their postproduction mission is done (PROD-026).
  "production_step_done",
  // A deliverable transmitted to the person in charge of Activations
  // (PROD-039).
  "production_handed_off",
  // The journey (Ibé, 14/10): a role given, a quote deposited, submitted,
  // decided, the director's proposal submitted or decided.
  "production_organized",
  "production_quote_deposited",
  "production_quote_submitted",
  "production_quote_decided",
  "production_direction_submitted",
  "production_direction_decided",
  // A step's blocker reported (to the person who unblocks and the owner) or
  // lifted (to its reporter and the owner); a noted information the owner
  // decides (to confirm, waiting for a decision, contradicting another).
  "step_blocker_reported",
  "step_blocker_lifted",
  "step_note_to_decide",
  // The Distribution (proto « Projet complet »): the dossier or the closure
  // to validate, then the decision back to who asked.
  "distribution_version_submitted",
  "distribution_version_decided",
  "distribution_closure_proposed",
  "distribution_closure_decided",
  // The Suivi & bilan (lot 7): a version of the bilan to decide, the
  // decision back; the Marketing closing asked, decided, reopened.
  "marketing_report_submitted",
  "marketing_report_decided",
  "marketing_closure_requested",
  "marketing_closure_decided",
  "marketing_closure_reopened",
  // The Activations (proto « Projet complet »): an activation given to its
  // owner, suspended, a creator's gesture on her private link.
  "activation_owner_assigned",
  "activation_suspended",
  "activation_creator_acted",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export function isNotificationKind(value: unknown): value is NotificationKind {
  return (
    typeof value === "string" &&
    (NOTIFICATION_KINDS as readonly string[]).includes(value)
  );
}

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  text: string;
  href: string;
  createdAt: string;
  read: boolean;
};

// The text is written here, from the kind and the linked objects: the
// database stores identifiers only.
export function notificationText(
  kind: NotificationKind,
  actorName: string | null,
  projectTitle: string | null,
): string {
  const t = fr.notifications;
  return t.texts[kind](actorName || t.someone, projectTitle || t.aProject);
}

// A contract or a meeting opens its own page (`subjectId`); a design version
// opens the Conception; a validation opens its stage's own page (the summary
// screen, for the Cadrage's guided review, so the "Valider"/"Refuser"
// buttons are the first thing in view); everything else the project overview.
// Where a production notification opens: the deliverable's step and anchor
// (the subject is the deliverable).
const PRODUCTION_TARGETS: Partial<Record<NotificationKind, [string, string]>> =
  {
    production_export_deposited: ["delivery", "exports"],
    production_shoot_started: ["shoot", "shoot-day"],
    production_call_sheet_published: ["call-sheet", "call-sheet"],
    production_step_done: ["post", "steps"],
    production_handed_off: ["delivery", "activations"],
    production_version_submitted: ["post", "decision"],
    production_organized: ["organisation", "who-does-what"],
    production_quote_deposited: ["quote", "quotes"],
    production_quote_submitted: ["quote", "quotes"],
    production_quote_decided: ["quote", "quotes"],
    production_direction_submitted: ["direction", "direction-decision"],
    production_direction_decided: ["direction", "direction-decision"],
  };

export function notificationHref(
  kind: NotificationKind,
  projectId: string | null,
  stageKey?: StageKey | null,
  subjectId?: string | null,
): string {
  if (kind.startsWith("contract_") && subjectId)
    return routes.contract(subjectId);
  if (kind === "meeting_invited" && subjectId) return routes.meeting(subjectId);
  // A call's report shared with a member: that report only (PROJ-AMEL-01).
  if (kind === "call_report_shared" && subjectId)
    return routes.callReport(subjectId);
  if (!projectId) return routes.app;
  // A production version: the deliverable's Postproduction (the subject is
  // the deliverable).
  if (kind.startsWith("production_") && subjectId) {
    const [step, anchor] = PRODUCTION_TARGETS[kind] ?? ["post", "versions"];
    return `${routes.projectProductionStep(projectId, subjectId, step)}#${anchor}`;
  }
  // The Distribution: the dossier's step, or its closure.
  if (kind.startsWith("distribution_"))
    return distributionStepHref(
      projectId,
      kind.startsWith("distribution_closure") ? "closure" : "dossier",
    );
  // The Suivi & bilan: the bilan's step, or the Marketing closing's.
  if (kind.startsWith("marketing_report_"))
    return reviewStepHref(projectId, "bilan");
  if (kind.startsWith("marketing_closure_"))
    return reviewStepHref(projectId, "closure");
  // An activation: its page, the list on the left (the subject is it).
  if (kind.startsWith("activation_"))
    return subjectId
      ? routes.projectActivation(projectId, subjectId)
      : routes.projectActivations(projectId);
  if (kind === "call_invited" && subjectId)
    return routes.projectCall(projectId, subjectId);
  if (kind === "brief_approved") return routes.projectFramingBrief(projectId);
  // A fiche received: the project's Fiches de renseignements.
  if (kind === "legal_form_received")
    return routes.projectLegalStep(projectId, "forms");
  // A borrowing opens on its démarche, a step of the Juridique.
  if (kind.startsWith("clearance_") || kind === "legal_element_withdrawn")
    return subjectId
      ? legalDemarcheHref(projectId, "clearance", subjectId)
      : routes.projectLegalStep(projectId, "clearances");
  // The engineer confirmed the package: its follow-up, in the Master's Mix.
  if (
    kind === "master_transmission_received" ||
    kind === "master_delivery_received" ||
    kind.startsWith("master_mix_")
  )
    return routes.projectMasterStep(projectId, "mix");
  // A message or a signal of the engineer: the thread, under the Mix.
  if (kind === "master_engineer_signal")
    return `${routes.projectMasterStep(projectId, "mix")}#engineer-thread`;
  // The mastering has its own step (ticket « Architecture globale »).
  if (kind.startsWith("master_mastering_"))
    return routes.projectMasterStep(projectId, "mastering");
  if (kind === "master_source_newer")
    return routes.projectMasterStep(projectId, "source");
  if (kind === "master_final_approved")
    return routes.projectMasterStep(projectId, "final");
  // A strategy document's review: the version itself (Brief de sortie or
  // Plan de sortie), where reviewers decide and the owner sees each answer.
  if (kind === "strategy_validated")
    return routes.projectStrategyStep(projectId, "validated");
  if (kind.startsWith("strategy_review_"))
    return subjectId
      ? routes.projectStrategyDocument(projectId, subjectId)
      : routes.projectStrategyBrief(projectId);
  // A new version of a sheet: its card in the Fiches Livrables.
  if (kind === "design_sheet_new_version")
    return subjectId
      ? routes.projectDesignSheet(projectId, subjectId)
      : routes.projectDesignStep(projectId, "sheets");
  // A validation request of the Conception: decided in its step.
  if (kind.startsWith("design_submission_"))
    return subjectId
      ? routes.projectDesignDecision(projectId, subjectId)
      : routes.projectDesign(projectId);
  // The proposal itself, on its deliverable's work page (MKT-C2-10).
  if (kind.startsWith("design_version_"))
    return subjectId
      ? routes.projectDesignVersion(projectId, subjectId)
      : routes.projectDesign(projectId);
  if (kind.startsWith("validation_")) {
    // The Brief's own page: the validator decides there, the owner sees
    // the decision and what was reopened.
    if (stageKey === "framing") return routes.projectFramingBrief(projectId);
    if (stageKey === "launch_strategy")
      return routes.projectStrategyBrief(projectId);
    // MKT-C2-12: the dossier is validated on its Brief créatif.
    if (stageKey === "design") return routes.projectDesignBrief(projectId);
  }
  return routes.project(projectId);
}

// Keys of stage_definitions relevant to a validation's kind of stage.
export type StageKey = "framing" | "launch_strategy" | "design";
