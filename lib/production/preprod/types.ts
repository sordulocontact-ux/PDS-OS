// Préproduction of a deliverable: what lib/production/preprod/queries.ts
// reads, as the page and its rules use it. Same lists as the database
// (supabase/migrations/20261010006001_production_preproduction.sql).
// Client-safe.

import type { ProductionCallSummary } from "@/lib/production/call-queries";
import type { ProductionFile } from "@/lib/production/files/queries";
import type { Holder } from "@/lib/production/sheet";
import type { Team, TeamBriefContent, TeamFields } from "./team-briefs";

const oneOf =
  <T extends string>(list: readonly T[], fallback: T) =>
  (value: unknown): T =>
    typeof value === "string" && (list as readonly string[]).includes(value)
      ? (value as T)
      : fallback;

export const CALL_ITEM_KINDS = [
  "decision",
  "hypothesis",
  "action",
  "to_decide",
] as const;
export type CallItemKind = (typeof CALL_ITEM_KINDS)[number];
export const callItemKindOf = oneOf(CALL_ITEM_KINDS, "decision");

export const CALL_ITEM_STATUSES = [
  "proposed",
  "confirmed",
  "rejected",
] as const;
export type CallItemStatus = (typeof CALL_ITEM_STATUSES)[number];
export const callItemStatusOf = oneOf(CALL_ITEM_STATUSES, "proposed");

export const PLAN_STATUSES = ["draft", "approved", "removed"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];
export const planStatusOf = oneOf(PLAN_STATUSES, "draft");

export const EQUIPMENT_CATEGORIES = [
  "image",
  "light",
  "sound",
  "other",
] as const;
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];
export const equipmentCategoryOf = oneOf(EQUIPMENT_CATEGORIES, "other");

export const EQUIPMENT_STATUSES = [
  "need",
  "quoted",
  "to_verify",
  "retained",
  "booked",
  "picked_up",
  "on_site",
  "to_return",
  "returned",
  "incident",
] as const;
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];
export const equipmentStatusOf = oneOf(EQUIPMENT_STATUSES, "need");

export const BUDGET_CATEGORIES = [
  "direction",
  "camera",
  "sound",
  "performers",
  "production",
  "equipment",
  "location",
  "post",
  "other",
] as const;
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];
export const budgetCategoryOf = oneOf(BUDGET_CATEGORIES, "other");

export const PREPROD_BUDGET_STATUSES = [
  "planned",
  "to_estimate",
  "estimated",
  "to_decide",
  "validated",
  "committed",
] as const;
export type PreprodBudgetStatus = (typeof PREPROD_BUDGET_STATUSES)[number];
export const preprodBudgetStatusOf = oneOf(
  PREPROD_BUDGET_STATUSES,
  "to_estimate",
);

export const CHECK_KEYS = [
  "location",
  "team",
  "equipment",
  "schedule",
  "budget",
  "call_sheet",
  "permits",
  "backup",
] as const;
export type CheckKey = (typeof CHECK_KEYS)[number];
export const isCheckKey = (value: unknown): value is CheckKey =>
  typeof value === "string" &&
  (CHECK_KEYS as readonly string[]).includes(value);

export const CALL_SHEET_FIELDS = [
  "callTime",
  "schedule",
  "contactsNote",
  "sequences",
  "instructions",
  "emergencies",
  "documentsNote",
] as const;
export type CallSheetField = (typeof CALL_SHEET_FIELDS)[number];
// Same limits as the database.
export const CALL_SHEET_LIMITS: Record<CallSheetField, number> = {
  callTime: 200,
  schedule: 4000,
  contactsNote: 2000,
  sequences: 4000,
  instructions: 4000,
  emergencies: 2000,
  documentsNote: 2000,
};

export type TeamBrief = {
  team: Team;
  fields: TeamFields;
  snapshot: TeamBriefContent | null;
  transmittedAt: string | null;
  transmittedBy: string | null;
};

export type CallItem = {
  id: string;
  callId: string | null;
  topic: string;
  kind: CallItemKind;
  body: string;
  status: CallItemStatus;
  source: "manual" | "call_report";
  sourceQuote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type PlanAction = {
  id: string;
  itemId: string | null;
  title: string;
  holder: Holder | null;
  dueDate: string | null;
  dependsOn: string[];
  blocking: boolean;
  status: PlanStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  taskId: string | null;
  // The task's own state in Travail, when one was created.
  taskDone: boolean | null;
  note: string | null;
  // The step of the proposed plan it comes from (PROD-006), if any.
  templateKey: string | null;
};

export type Equipment = {
  id: string;
  category: EquipmentCategory;
  label: string;
  quantity: number | null;
  supplierContactId: string | null;
  supplierName: string | null;
  priceCents: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  depositCents: number | null;
  returnTerms: string | null;
  status: EquipmentStatus;
  quoteFileId: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  returnHolder: Holder | null;
  returnDue: string | null;
  returnedAt: string | null;
  incidentNote: string | null;
  note: string | null;
  // Rented, lent or owned (an owned item is never returned, PROD-022), how
  // many arrived (PROD-015), and a return problem's nature.
  source: EquipmentSource;
  receivedQuantity: number | null;
  returnIssue: "missing" | "damaged" | null;
};

export const EQUIPMENT_SOURCES = ["rental", "loan", "owned"] as const;
export type EquipmentSource = (typeof EQUIPMENT_SOURCES)[number];
export const equipmentSourceOf = (value: unknown): EquipmentSource =>
  value === "loan" || value === "owned" ? value : "rental";

/** Booked one number, received another: the gap to say (PROD-015). */
export const quantityGap = (
  e: Pick<Equipment, "quantity" | "receivedQuantity">,
) =>
  e.quantity !== null &&
  e.receivedQuantity !== null &&
  e.receivedQuantity !== e.quantity;

export type PreprodBudgetLine = {
  id: string;
  label: string;
  category: BudgetCategory;
  amountCents: number | null;
  status: PreprodBudgetStatus;
  equipmentId: string | null;
  note: string | null;
};

export type CallSheet = Record<CallSheetField, string | null> & {
  updatedBy: string | null;
  updatedAt: string | null;
};

export type ReadinessCheck = {
  key: CheckKey;
  required: boolean;
  confirmedBy: string | null;
  confirmedAt: string | null;
  note: string | null;
  // Who secures it (PROD-017), and a derogation's reason and author (PROD-008).
  holder: Holder | null;
  derogation: { reason: string; by: string | null; at: string } | null;
};

/** A production call of the sheet and the topics of its agenda. */
export type PreprodCall = ProductionCallSummary & { topics: string[] };

export type PreprodData = {
  briefs: TeamBrief[];
  calls: PreprodCall[];
  items: CallItem[];
  actions: PlanAction[];
  equipment: Equipment[];
  budget: PreprodBudgetLine[];
  callSheet: CallSheet | null;
  checks: ReadinessCheck[];
  // Quotes and rental captures, newest first (signed URLs).
  quotes: ProductionFile[];
};
