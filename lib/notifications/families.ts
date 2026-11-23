// What a notification is, for the bell's menu: a request (the reader is
// expected to decide, check or answer: the « Demandes » tab) and its family
// (the small badge on its avatar, as Figma's comment, mention and invite).
// Client-safe; decided by the code from the kind, never stored.

import type { NotificationKind } from "@/lib/notifications/types";

export const REQUEST_KINDS = [
  "project_transmitted",
  "project_clarification_requested",
  "validation_requested",
  "task_assigned",
  "design_version_submitted",
  "design_submission_requested",
  "contract_review_requested",
  "contract_signed_emailed",
  "master_bank_details_changed",
  "master_delay_escalated",
  "master_invoice_received",
  "master_round_assigned",
  "master_files_requested",
  "clearance_terms_proposed",
  "clearance_reply_received",
  "strategy_review_requested",
  "strategy_review_reminder",
  "production_version_submitted",
  "production_export_deposited",
  "production_organized",
  "production_quote_deposited",
  "production_quote_submitted",
  "production_direction_submitted",
  "production_ready_requested",
  "step_blocker_reported",
  "step_note_to_decide",
  "distribution_version_submitted",
  "distribution_closure_proposed",
  "distribution_reserve_lift_requested",
  "marketing_report_submitted",
  "marketing_closure_requested",
  "activation_owner_assigned",
  "legal_template_to_validate",
  "legal_invoice_received",
  "deal_assigned",
  "deal_agreement_proposed",
  "deal_follow_up_due",
  "deal_memo_received",
  "deal_memo_submitted",
] as const satisfies readonly NotificationKind[];

export function isRequestKind(kind: NotificationKind): boolean {
  return (REQUEST_KINDS as readonly string[]).includes(kind);
}

export type NotificationFamily =
  | "request"
  | "done"
  | "changes"
  | "received"
  | "added"
  | "meeting"
  | "money"
  | "message";

// First match wins: a request before what its words would say otherwise.
const FAMILIES: [RegExp, NotificationFamily][] = [
  [/invoice|bank_details|_paid$/, "money"],
  [/^meeting_|^call_invited$|_call_planned$/, "meeting"],
  [
    /feedback|signal|shared|clarification|blocker_reported|note_|reminder/,
    "message",
  ],
  [
    /rejected|refused|declined|changes|discarded|withdrawn|suspended/,
    "changes",
  ],
  [
    /approved|validated|accepted|confirmed|signed|done|decided|lifted|granted|launched$/,
    "done",
  ],
  [/assigned|added|invited|organized|proposed$|transmitted$/, "added"],
];

export function notificationFamily(kind: NotificationKind): NotificationFamily {
  for (const [pattern, family] of FAMILIES)
    if (pattern.test(kind)) return family;
  return isRequestKind(kind) ? "request" : "received";
}
