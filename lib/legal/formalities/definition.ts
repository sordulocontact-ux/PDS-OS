// The definition SACEM_725_EDITED_WORK, version 1 (ticket Juridique 06,
// from the « bulletin SACEM 725 — 02/2026 », œuvres éditées): its fields,
// grouped as the bulletin reads, which are required, and how a missing
// requirement of formality_missing (SQL) is said. No SPPF field, no field
// the ticket does not name. Client-safe.

import { fr } from "@/lib/i18n/fr";

export const SACEM_725 = "SACEM_725_EDITED_WORK";

export const FORMALITY_STATUSES = [
  "collecting_data",
  "ready_to_generate",
  "document_ready",
  "signatures_pending",
  "ready_to_submit",
  "submitted",
  "processing",
  "completed",
  "action_required",
] as const;
export type FormalityStatus = (typeof FORMALITY_STATUSES)[number];

export type FieldKind =
  | "text"
  | "date"
  | "textarea"
  | "creators"
  | "publishers"
  | "dep_dr"
  | "arrangement"
  | "contract";

export type FormalityField = {
  key: string;
  section: "work" | "exploitation" | "people" | "agreements";
  kind: FieldKind;
  required: boolean;
};

export const SACEM_725_FIELDS: readonly FormalityField[] = [
  { key: "title", section: "work", kind: "text", required: true },
  { key: "subtitle", section: "work", kind: "text", required: false },
  { key: "genre", section: "work", kind: "text", required: false },
  { key: "duration", section: "work", kind: "text", required: true },
  { key: "group_name", section: "work", kind: "text", required: false },
  { key: "iswc", section: "work", kind: "text", required: false },
  { key: "performers", section: "exploitation", kind: "text", required: false },
  // The bulletin asks the date and, apart, the place or broadcaster.
  {
    key: "first_exploitation",
    section: "exploitation",
    kind: "date",
    required: false,
  },
  {
    key: "first_exploitation_place",
    section: "exploitation",
    kind: "text",
    required: false,
  },
  {
    key: "territories",
    section: "exploitation",
    kind: "text",
    required: false,
  },
  { key: "creators", section: "people", kind: "creators", required: true },
  { key: "publishers", section: "people", kind: "publishers", required: false },
  { key: "dep_dr", section: "people", kind: "dep_dr", required: true },
  {
    key: "arrangement",
    section: "agreements",
    kind: "arrangement",
    required: false,
  },
  {
    key: "publishing_contract",
    section: "agreements",
    kind: "contract",
    required: false,
  },
];

export const QUALITIES = ["author", "composer", "arranger", "adapter"] as const;

// Rubrique D: within each category, the DEP and DR shares follow the Phono
// shares (the box of the bulletin ticked) or the equal sharing of the
// Règlement général (left empty). Checked in formality_missing (SQL).
export const DEP_DR_CHOICES = ["follow_phono", "statutory"] as const;
export type Quality = (typeof QUALITIES)[number];

export type Creator = {
  last_name: string;
  first_name: string;
  pseudonym: string;
  ipi: string;
  quality: Quality | "";
  // Exact share, « 33.3334 » (from the confirmed split when there is one,
  // to verify).
  phono: string;
  signs: boolean;
  // The Réseau contact this creator was picked from (never by name).
  contact_id?: string;
};
export type Publisher = {
  name: string;
  ipi: string;
  phono: string;
  contact_id?: string;
};

// What the bulletin takes of a person, from their name in the Réseau and
// their fiche de renseignements (contact_legal_details).
export function creatorIdentity(
  name: string,
  details: Record<string, string>,
): Pick<Creator, "last_name" | "first_name" | "pseudonym" | "ipi"> {
  return {
    last_name: details.legal_last_name || name,
    first_name: details.legal_first_name || "",
    pseudonym: details.pseudonym || (details.legal_last_name ? name : ""),
    ipi: details.ipi_coad || "",
  };
}

// The bulletin's quality of a credit of the title.
export const QUALITY_OF_ROLE: Partial<Record<string, Quality>> = {
  lyricist: "author",
  composer: "composer",
  arranger: "arranger",
};

/** A code of formality_missing (SQL) in words. */
export function formalityMissingLabel(code: string): string {
  const t = fr.legalFormalities.missing;
  const [what, ...rest] = code.split(":");
  const arg = rest.join(":");
  switch (what) {
    case "creator_name":
      return t.creator_name(arg);
    case "creator_quality":
      return t.creator_quality(arg);
    case "borrowing":
      return t.borrowing(arg);
    case "to_verify":
      return t.to_verify(fr.legalFormalities.fields[arg] ?? arg);
    default: {
      const simple = t[what as keyof typeof t];
      return typeof simple === "string" ? simple : code;
    }
  }
}
