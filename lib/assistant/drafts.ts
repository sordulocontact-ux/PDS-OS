// Drafts proposed by PO (docs/ASSISTANT.md § 3 bis). A draft is never
// written: it pre-fills the real form, a person reviews it and saves with
// their own session. Client-safe.

import type { Credit } from "@/lib/catalog/types";
import type { ContactRole } from "@/lib/catalog/contacts";
import type { Priority, ProjectType } from "@/lib/projects/types";

/** One line of the proposal card, written by code. */
export type DraftChange = {
  label: string;
  before: string | null;
  after: string;
};

export type ContactDraft = {
  role: ContactRole;
  name: string;
  email: string | null;
  phone: string | null;
};

export type ArtistDraft = {
  kind: "artist";
  // Null = a new artist.
  artistId: string | null;
  values: {
    name: string;
    notes: string | null;
    legalName: string | null;
    countryCode: string | null;
    bio: string | null;
  };
  contacts: ContactDraft[];
};

export type MasterDraft = {
  kind: "master";
  masterId: string | null;
  values: {
    title: string;
    version: string;
    // Form formats: "FRZ032600001", "3:07"; empty when not given.
    isrc: string;
    duration: string;
    credits: Credit[];
  };
};

export type ProjectDraft = {
  kind: "project";
  projectId: string | null;
  values: {
    title: string;
    type: ProjectType | null;
    masterIds: string[];
    // Creation only: the team of a created project changes by transmission.
    assigneePersonId: string | null;
    creativePersonIds: string[];
    // "2027-03-12", "1500,50"; empty when not given.
    dueDate: string;
    budget: string;
    priority: Priority | null;
    framingNotes: string;
  };
};

export type Draft = ArtistDraft | MasterDraft | ProjectDraft;

export type DraftProposal = {
  draft: Draft;
  // What the draft would write, for the card; warnings are what PO could not do.
  title: string;
  changes: DraftChange[];
  warnings: string[];
};

const KINDS = new Set(["artist", "master", "project"]);

/** Tool output → proposal. The output is ours, the check only guards the UI. */
export function proposalOf(output: unknown): DraftProposal | null {
  if (typeof output !== "object" || output === null) return null;
  const proposal = (output as { proposal?: unknown }).proposal;
  if (typeof proposal !== "object" || proposal === null) return null;
  const draft = (proposal as { draft?: { kind?: unknown } }).draft;
  return draft && KINDS.has(draft.kind as string)
    ? (proposal as DraftProposal)
    : null;
}

/** 150050 → "1500,50", the budget field's format. */
export function centsToEuros(cents: number | null): string {
  if (cents === null) return "";
  const euros = cents / 100;
  return Number.isInteger(euros)
    ? String(euros)
    : euros.toFixed(2).replace(".", ",");
}
