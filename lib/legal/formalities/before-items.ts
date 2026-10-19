// « Avant de générer » (proto « Projet complet », Déclaration SACEM): each
// field of the bulletin as it stands on screen — missing and required
// (Bloquant), proposed from a source and not confirmed yet (À confirmer),
// empty and optional (Facultatif); what the SACEM reopened is to confirm
// again. Codes of formality_missing that no field answers (a borrowing, a
// creator's name) are blocking too. Pure, client-safe.

import { fr } from "@/lib/i18n/fr";
import {
  SACEM_725_FIELDS,
  formalityMissingLabel,
  type Creator,
  type Publisher,
} from "@/lib/legal/formalities/definition";

export type Entry = { value: unknown; typed: boolean };
export type BeforeColumn = "blocking" | "toConfirm" | "optional";
export type BeforeEntry = {
  key: string;
  label: string;
  column: BeforeColumn;
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

export function beforeItems(input: {
  entries: Record<string, Entry>;
  // Where each proposed value comes from (prefill, or the stored source).
  sourceOf: (key: string) => string | null;
  reopened: ReadonlySet<string>;
  missing: string[];
}): BeforeEntry[] {
  const t = fr.legalFormalities;
  const b = fr.legalDocuments.bulletin;
  const { entries } = input;
  const creators = (entries.creators?.value as Creator[] | null) ?? [];
  const publishers = (entries.publishers?.value as Publisher[] | null) ?? [];
  const requiredOf = (key: string, required: boolean) =>
    required ||
    (key === "arrangement" && creators.some((c) => c.quality === "arranger")) ||
    (key === "publishing_contract" && publishers.length > 0);

  const fields = SACEM_725_FIELDS.filter(
    (f) => f.kind !== "publishers",
  ).flatMap((field): BeforeEntry[] => {
    const entry = entries[field.key];
    const label = t.fields[field.key];
    const base = { key: field.key, label, confirmable: false };
    if (!entry || !filled(entry.value))
      return [
        requiredOf(field.key, field.required)
          ? {
              ...base,
              column: "blocking",
              reason: t.notes[field.key] ?? b.required,
            }
          : { ...base, column: "optional", reason: b.optionalNote },
      ];
    if (input.reopened.has(field.key))
      return [{ ...base, column: "toConfirm", reason: t.sources.toVerify }];
    if (!entry.typed)
      return [
        {
          ...base,
          column: "toConfirm",
          reason: b.proposed(input.sourceOf(field.key) ?? t.sources.toVerify),
          confirmable: true,
        },
      ];
    return [];
  });
  const keys = new Set(SACEM_725_FIELDS.map((f) => f.key));
  const others = input.missing
    .filter((code) => !keys.has(code))
    .map((code): BeforeEntry => ({
      key: code,
      label: formalityMissingLabel(code),
      column: "blocking",
      reason: b.required,
      confirmable: false,
    }));
  return [...fields, ...others];
}
