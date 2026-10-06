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
  "contract_review_requested",
  "contract_approved",
  "contract_changes_requested",
  "meeting_invited",
  "master_transmission_received",
  "master_mix_version_received",
  "master_mix_approved",
  "master_mix_changes_requested",
  "master_mastering_version_received",
  "master_final_approved",
  "master_mastering_changes_requested",
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
  if (!projectId) return routes.app;
  // The engineer confirmed the package: its follow-up, in the Master's Mix.
  if (kind === "master_transmission_received" || kind.startsWith("master_mix_"))
    return routes.projectMasterStep(projectId, "mix");
  if (kind.startsWith("master_mastering_"))
    return routes.projectMasterStep(projectId, "mastering");
  if (kind === "master_final_approved")
    return routes.projectMasterStep(projectId, "final");
  if (kind.startsWith("design_version_"))
    return routes.projectDesign(projectId);
  if (kind.startsWith("validation_")) {
    if (stageKey === "framing")
      return routes.projectFramingStep(projectId, "summary");
    if (stageKey === "launch_strategy")
      return routes.projectStrategy(projectId);
    if (stageKey === "design") return routes.projectDesign(projectId);
  }
  return routes.project(projectId);
}

// Keys of stage_definitions relevant to a validation's kind of stage.
export type StageKey = "framing" | "launch_strategy" | "design";
