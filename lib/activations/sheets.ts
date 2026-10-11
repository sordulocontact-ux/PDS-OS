// Activation sheets (framing, concepts): the fields of each, checked by the
// app (the database keeps a JSON object). Each value carries its provenance.
// Client-safe.

import type { ActivationKind, SheetStatus } from "@/lib/activations/model";

export const SHEET_FIELDS = {
  framing_influence: [
    "objective",
    "audience",
    "platforms",
    "milestones",
    "constraints",
    "mentions",
  ],
  framing_press: [
    "objectives",
    "audience",
    "main_message",
    "angles",
    "proof_points",
    "spokesperson",
    "calendar",
    "restrictions",
    "press_contact",
  ],
  concept: [
    "angle",
    "format",
    "mechanic",
    "message",
    "constraints",
    "references",
    "deliverable",
    "justification",
  ],
} as const;

export type SheetFieldKey =
  | (typeof SHEET_FIELDS)["framing_influence"][number]
  | (typeof SHEET_FIELDS)["framing_press"][number]
  | (typeof SHEET_FIELDS)["concept"][number];

/** Where a value comes from: « manual » (typed here), or its source. */
export type SheetSource =
  "manual" | "strategy" | "calendar" | "project" | "framing" | "concept";
export type SheetValue = { value: string; source: SheetSource };
export type SheetFields = Partial<Record<SheetFieldKey, SheetValue>>;

export function sheetFieldKeys(
  kind: "framing" | "concept",
  activationKind: ActivationKind,
): readonly SheetFieldKey[] {
  if (kind === "concept") return SHEET_FIELDS.concept;
  return activationKind === "press"
    ? SHEET_FIELDS.framing_press
    : SHEET_FIELDS.framing_influence;
}

export type SheetVersion = {
  id: string;
  kind: "framing" | "concept";
  targetId: string | null;
  version: number;
  fields: SheetFields;
  status: SheetStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionComment: string | null;
  updatedAt: string;
};

/** Reads a stored JSON object as fields, keeping only known keys. */
export function toSheetFields(
  raw: unknown,
  keys: readonly SheetFieldKey[],
): SheetFields {
  const out: SheetFields = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of keys) {
    const v = (raw as Record<string, unknown>)[key];
    if (
      v &&
      typeof v === "object" &&
      typeof (v as SheetValue).value === "string"
    )
      out[key] = {
        value: (v as SheetValue).value,
        source: (v as SheetValue).source ?? "manual",
      };
  }
  return out;
}
