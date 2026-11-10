// Where each value of the bulletin stands, said on its line (recette
// Juridique V1, JUR-02, proto Juridique v3): missing and required
// (Manquant), proposed from a source and not confirmed yet (Proposé), or
// confirmed — empty and optional says nothing. What the SACEM reopened is to
// confirm again. Codes of formality_missing that no field answers (a
// borrowing, a creator's name) are missing too. Pure, client-safe.

import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import {
  SACEM_725_FIELDS,
  formalityMissingLabel,
  type Creator,
  type FormalitySection,
  type Publisher,
} from "@/lib/legal/formalities/definition";

const fr = { legalDocuments, legalFormalities };

// The section of a code that no field answers.
function sectionOfCode(code: string): FormalitySection {
  if (code.endsWith("_total") || code === "phono_split") return "sharing";
  if (code.startsWith("creator") || code.startsWith("main_artist"))
    return "creators";
  if (code.startsWith("publisher")) return "publishers";
  return "work";
}
// Codes said by a field itself, on screen, never twice.
// Codes said on a field's own row, never as a line apart: the choice of a
// publisher (or none) is the « Éditeur musical » row's (Sacha, 09/11/2026).
const FIELD_CODES = new Set(["dep_dr_check", "publishers_choice"]);

export type Entry = { value: unknown; typed: boolean };
export type FieldState = "missing" | "proposed" | "optional";
export type FieldStateEntry = {
  key: string;
  // The section whose line says it.
  section: FormalitySection;
  label: string;
  state: FieldState;
  reason: string;
  // A proposed value the person may confirm as it is.
  confirmable: boolean;
};

/** A value says something: text, a non-empty list, a choice. */
export function filled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object")
    return Object.values(value as Record<string, unknown>).some(
      (v) => v !== "" && v !== null && v !== false,
    );
  return true;
}

export function fieldStates(input: {
  entries: Record<string, Entry>;
  // Where each proposed value comes from (prefill, or the stored source).
  sourceOf: (key: string) => string | null;
  reopened: ReadonlySet<string>;
  missing: string[];
}): FieldStateEntry[] {
  const t = fr.legalFormalities;
  const b = fr.legalDocuments.bulletin;
  const { entries } = input;
  const creators = (entries.creators?.value as Creator[] | null) ?? [];
  const publishers = (entries.publishers?.value as Publisher[] | null) ?? [];
  const requiredOf = (key: string, required: boolean) =>
    required ||
    (key === "arrangement" &&
      creators.some((c) => c.roles?.includes("arranger"))) ||
    (key === "publishing_contract" && publishers.length > 0);

  const fields = SACEM_725_FIELDS.flatMap((field): FieldStateEntry[] => {
    const entry = entries[field.key];
    const label = t.fields[field.key];
    const base = {
      key: field.key,
      section: field.section,
      label,
      confirmable: false,
    };
    const depDr = entry?.value as { choice?: string; checked?: boolean } | null;
    const empty =
      field.key === "dep_dr" ? !depDr?.choice : !entry || !filled(entry.value);
    if (empty && field.key === "publishers")
      return [
        input.missing.includes("publishers_choice")
          ? {
              ...base,
              state: "missing",
              reason: formalityMissingLabel("publishers_choice"),
            }
          : { ...base, state: "optional", reason: "" },
      ];
    if (empty)
      return [
        requiredOf(field.key, field.required)
          ? {
              ...base,
              state: "missing",
              reason: t.notes[field.key] ?? b.required,
            }
          : { ...base, state: "optional", reason: "" },
      ];
    if (input.reopened.has(field.key))
      return [{ ...base, state: "proposed", reason: t.sources.toVerify }];
    // Computed by the code, checked by a person (JUR-02).
    if (field.key === "dep_dr" && !depDr?.checked)
      return [{ ...base, state: "proposed", reason: t.sharing.toCheck }];
    if (!entry?.typed)
      return [
        {
          ...base,
          state: "proposed",
          reason: b.proposed(input.sourceOf(field.key) ?? t.sources.toVerify),
          confirmable: true,
        },
      ];
    return [];
  });
  const keys = new Set(SACEM_725_FIELDS.map((f) => f.key));
  const others = input.missing
    .filter((code) => !keys.has(code) && !FIELD_CODES.has(code))
    .filter((code) => !code.startsWith("to_verify:"))
    .map((code): FieldStateEntry => ({
      key: code,
      section: sectionOfCode(code),
      label: formalityMissingLabel(code),
      state: "missing",
      reason: b.required,
      confirmable: false,
    }));
  return [...fields, ...others];
}
