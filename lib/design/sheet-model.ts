// A Fiche Livrable as the proto shows it (« Projet complet », FICHE_DEF,
// fieldRow): the fields its format needs, each with its value — written in
// the sheet, or proposed by code from a source — and that source in full
// words (rule 2 to 4). Pure functions; the proposals are computed on the
// server (lib/design/sheet-proposals.ts). Client-safe.

import type { DeliverableFormat } from "@/lib/design/formats";
import { RATIO_PRESETS, type SheetProvenance } from "@/lib/design/sheet-fields";
import { designSteps } from "@/lib/i18n/fr/design-steps";
import type { Database } from "@/lib/supabase/database.types";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { designSteps };

type SheetRow = Database["public"]["Tables"]["design_sheets"]["Row"];

export const SHEET_FIELD_KEYS = [
  "concept",
  "intention",
  "duration",
  "ratios",
  "subtitles",
  "variants",
  "notes",
  "file_format",
  "shoot_date",
  "post_start",
  "post_deadline",
  "delivery_date",
  "budget",
  "dependencies",
  "production_notes",
] as const;
export type SheetFieldKey = (typeof SHEET_FIELD_KEYS)[number];
export const isSheetFieldKey = (v: unknown): v is SheetFieldKey =>
  SHEET_FIELD_KEYS.includes(v as SheetFieldKey);

export type SheetFieldType =
  "text" | "long" | "date" | "ratios" | "subs" | "money" | "duration";

export const FIELD_TYPE: Record<SheetFieldKey, SheetFieldType> = {
  concept: "text",
  intention: "text",
  duration: "duration",
  ratios: "ratios",
  subtitles: "subs",
  variants: "text",
  notes: "long",
  file_format: "text",
  shoot_date: "date",
  post_start: "date",
  post_deadline: "date",
  delivery_date: "date",
  budget: "money",
  dependencies: "text",
  production_notes: "text",
};

// The subtitles as four choices (proto SUBTITLES): « Oui, intégrés aux
// exports » / « Oui, fichier séparé » / « Oui, intégrés et fichier séparé »
// / « Non » — the columns subtitles + subtitle_mode.
export const SUBTITLE_CHOICES = ["burned", "file", "both", "none"] as const;
export type SubtitleChoice = (typeof SUBTITLE_CHOICES)[number];

export type Money = { cents: number; engaged: boolean };
export type FieldValue = string | string[] | Money | null;

// Which fields a format needs, required first (proto FICHE_DEF: clip,
// teasers, pochette, and the generic sheet of an added deliverable).
const FIELDS: Record<DeliverableFormat, [SheetFieldKey, boolean][]> = {
  clip: [
    ["concept", true],
    ["intention", false],
    ["duration", true],
    ["ratios", true],
    ["subtitles", true],
    ["variants", false],
    ["notes", false],
    ["shoot_date", false],
    ["post_start", false],
    ["post_deadline", false],
    ["delivery_date", true],
    ["budget", false],
    ["dependencies", false],
    ["production_notes", false],
  ],
  short: [
    ["concept", true],
    ["duration", true],
    ["ratios", true],
    ["subtitles", true],
    ["delivery_date", true],
    ["budget", false],
  ],
  cover: [
    ["concept", true],
    ["file_format", true],
    ["notes", false],
    ["delivery_date", true],
    ["budget", false],
    ["production_notes", false],
  ],
  campaign: [
    ["concept", true],
    ["file_format", true],
    ["notes", false],
    ["delivery_date", true],
    ["budget", false],
  ],
  other: [
    ["concept", true],
    ["file_format", true],
    ["delivery_date", true],
    ["budget", false],
  ],
};

export const fieldsOf = (format: DeliverableFormat) => FIELDS[format];

/** A value proposed by code, and where it comes from (« Calculé : … »). */
export type FieldProposal = { value: FieldValue; source: string };

export type SheetFieldView = {
  key: SheetFieldKey;
  label: string;
  type: SheetFieldType;
  required: boolean;
  // What the sheet says now: written, else proposed.
  value: FieldValue;
  text: string | null;
  // Written in the sheet (else proposed or empty).
  stored: boolean;
  // The source line under the value.
  source: string | null;
  proposal: FieldProposal | null;
};

const empty = (v: FieldValue) =>
  v === null || v === "" || (Array.isArray(v) && v.length === 0);

/** What the sheet's columns say for a field (null = nothing written). */
export function storedValue(s: SheetRow, key: SheetFieldKey): FieldValue {
  switch (key) {
    case "duration": {
      const min = s.duration_min_seconds;
      const max = s.duration_max_seconds;
      if (min === null && max === null) return null;
      return String(min ?? max);
    }
    case "ratios":
      return s.ratios.length ? s.ratios : null;
    case "subtitles":
      if (s.subtitles === null) return null;
      return s.subtitles === false ? "none" : (s.subtitle_mode ?? "burned");
    case "notes":
      return [s.notes, s.constraints].filter(Boolean).join("\n") || null;
    case "budget":
      return s.budget_cents === null
        ? null
        : { cents: s.budget_cents, engaged: s.budget_state === "committed" };
    default:
      return s[key] ?? null;
  }
}

/** « 3 min », « 15 s », « 1:30 » (seconds as people say them). */
export function durationText(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** The value as the fiche says it (« Sam. 28/11/2026 », « 16:9 et 9:16 »). */
export function fieldText(type: SheetFieldType, v: FieldValue): string | null {
  const t = fr.designSteps.sheets;
  if (empty(v)) return null;
  switch (type) {
    case "date":
      return formatDay(v as string);
    case "ratios":
      return (v as string[]).join(t.ratiosJoin);
    case "money": {
      const m = v as Money;
      return t.money(formatAmount(m.cents), m.engaged);
    }
    case "subs":
      return t.subtitles[SUBTITLE_CHOICES.indexOf(v as SubtitleChoice)] ?? null;
    case "duration":
      return durationText(Number(v));
    default:
      return String(v);
  }
}

/**
 * The fields of a sheet for its format: each written value with its source
 * (provenance), else the code's proposal with its own, else empty.
 */
export function sheetFields(
  sheet: SheetRow,
  format: DeliverableFormat,
  provenance: SheetProvenance,
  proposals: Partial<Record<SheetFieldKey, FieldProposal>>,
): SheetFieldView[] {
  const labels = fr.designSteps.sheets.fields;
  return fieldsOf(format).map(([key, required]) => {
    const type = FIELD_TYPE[key];
    const stored = storedValue(sheet, key);
    const proposal = proposals[key] ?? null;
    const written = !empty(stored);
    const value = written ? stored : (proposal?.value ?? null);
    const origin = provenance[key];
    return {
      key,
      label: labels[key],
      type,
      required,
      value,
      text: fieldText(type, value),
      stored: written,
      source: written
        ? (origin?.detail ?? null)
        : value !== null
          ? (proposal?.source ?? null)
          : null,
      proposal,
    };
  });
}

/** The required fields still empty (« Il manque : Sous-titres »). */
export const missingFields = (fields: SheetFieldView[]) =>
  fields.filter((f) => f.required && empty(f.value)).map((f) => f.label);

export { RATIO_PRESETS };
