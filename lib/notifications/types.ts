// Notification types and text. Client-safe.

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

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
  // A borrowing's conditions (Juridique): to validate, validated, refused.
  "clearance_terms_proposed",
  "clearance_terms_validated",
  "clearance_terms_rejected",
  // A strategy document's review (Brief de sortie, Plan de sortie…): asked,
  // approved, a change asked, a reminder.
  "strategy_review_requested",
  "strategy_review_approved",
  "strategy_review_changes_requested",
  "strategy_review_reminder",
  // The creative team: the project launched, the Brief ready, a call.
  "project_launched",
  "brief_approved",
  "call_invited",
  // The engineer deposited a version through their link.
  "master_delivery_received",
  "master_mastering_delivery_received",
  // A fiche de renseignements came back through its link (JUR-11).
  "legal_form_received",
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
  if (kind === "call_invited" && subjectId)
    return routes.projectCall(projectId, subjectId);
  if (kind === "brief_approved") return routes.projectFramingBrief(projectId);
  // A fiche received: the project's Fiches de renseignements.
  if (kind === "legal_form_received")
    return routes.projectLegalStep(projectId, "forms");
  // A borrowing opens on its panel, in the project's Emprunts.
  if (kind.startsWith("clearance_"))
    return subjectId
      ? `${routes.projectLegalStep(projectId, "clearances")}?emprunt=${subjectId}`
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
  if (kind === "master_final_approved")
    return routes.projectMasterStep(projectId, "final");
  // A strategy document's review: the version itself (Brief de sortie or
  // Plan de sortie), where reviewers decide and the owner sees each answer.
  if (kind.startsWith("strategy_review_"))
    return subjectId
      ? routes.projectStrategyDocument(projectId, subjectId)
      : routes.projectStrategyBrief(projectId);
  // A validation request of the Conception: its decision page (MKT-C2-11).
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
