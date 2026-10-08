// Juridique's État des lieux (docs/ARCHITECTURE.md § 8 sexies): what a
// project already knows of its rights, agreements and filings, as facts the
// page displays as is. Client-safe.

import type {
  MasterDeclaration,
  MasterRights,
  MasterSplit,
  Organism,
  SplitKind,
} from "@/lib/catalog/master/rules";
import type { CreditContactAction } from "@/lib/facts/credit-contact";
import type { FormRole } from "@/lib/legal/forms/definition";
import {
  FACT_STATUSES,
  type Fact,
  type FactGroup,
  type FactStatus,
} from "@/lib/facts/types";

// The shared three levels (lib/facts/types.ts).
export const LEGAL_FACT_STATUSES = FACT_STATUSES;
export type LegalFactStatus = FactStatus;
export type LegalFactGroup = FactGroup;
export type LegalFact = Fact<LegalFactAction>;
export { countFacts } from "@/lib/facts/types";

/**
 * What a row offers, decided by the server from the viewer's permissions.
 * Every form is the one of the record's own page (Réseau, title), so the
 * rules stay in one place.
 */
export type LegalFactAction =
  // Add to the Réseau, or link a credit to its namesake.
  | CreditContactAction
  // A title's shares of one kind: the list to add, edit or remove shares.
  | {
      kind: "edit_splits";
      masterId: string;
      title: string;
      splitKind: SplitKind;
      // Every share of the title (the form may switch kind).
      shares: MasterSplit[];
    }
  // A title without any declaration: declare one (organism to choose).
  | { kind: "declare"; masterId: string; title: string }
  // A declaration filed: edit or remove it.
  | {
      kind: "edit_declaration";
      masterId: string;
      declaration: MasterDeclaration;
    };

// Order of the ticket's side panel: release, people, rights, agreements,
// formalities, then what the Cadrage flagged.
export const LEGAL_SECTION_KEYS = [
  "titles",
  "people",
  "splits",
  "agreements",
  "declarations",
  "flags",
] as const;
export type LegalSectionKey = (typeof LEGAL_SECTION_KEYS)[number];

export type LegalSection = {
  key: LegalSectionKey;
  facts: LegalFact[];
  // The read failed: the page says so instead of an empty list.
  failed: boolean;
};

// The Titres section reads better as one row per title, its identifiers in
// columns, than as three rows repeating the title.
export const TITLE_IDENTIFIERS = ["isrc", "iswc", "rightsHolder"] as const;
export type TitleIdentifier = (typeof TITLE_IDENTIFIERS)[number];

export type LegalTitleRow = {
  masterId: string;
  title: string;
  // The raw rights, for the "Modifier les droits" form.
  rights: MasterRights;
  // Credited artists, formatted ("Nova feat. Sable"): which song it is.
  artists: string;
  href: string;
  cells: Record<
    TitleIdentifier,
    { value: string | null; status: LegalFactStatus; statusLabel: string }
  >;
};

export type LegalInventory = {
  sections: LegalSection[];
  titles: LegalTitleRow[];
  projectId: string;
  // manage_catalog: credit, split, declare, edit a title from this page.
  canEditCatalog: boolean;
  // manage_contracts: create a contract attached to the project.
  canCreateContract: boolean;
  // Organisms already declared, per title: the "Déclarer" dialog offers the
  // others.
  declared: Record<string, Organism[]>;
  counts: Record<LegalFactStatus, number>;
  // People of the Réseau in the file without a credit (lot 6).
  projectContacts: Array<{
    id: string;
    contactId: string;
    name: string;
    role: FormRole;
  }>;
};
