// Drafts of the records PO prepares beyond the catalogue and projects
// (docs/ASSISTANT.md § 3 bis): contract templates, contracts, network
// contacts, tasks, internal meetings, budget lines. Same rule as every draft:
// it pre-fills the real form, a person saves it. Client-safe.

import type { BudgetFamily, BudgetStatus } from "@/lib/budget/types";
import type { Organism, SplitKind } from "@/lib/catalog/master/rules";
import type { ContractType, ContractValues } from "@/lib/contracts/types";
import type { FormRole } from "@/lib/legal/forms/definition";
import type { NetworkContactValues } from "@/lib/network/types";

/**
 * A new template, or a new version of one (`seriesId`): templates are never
 * edited (ticket Juridique 03). Null = not said: a new version keeps the
 * current value, read when the form opens. The text is only ever the one
 * the user pasted: PO writes no clause.
 */
export type ContractTemplateDraft = {
  kind: "contractTemplate";
  seriesId: string | null;
  values: {
    name: string | null;
    type: ContractType | null;
    roles: FormRole[] | null;
    usage: string | null;
    body: string | null;
  };
};

/** A contract, created or edited; the follower is chosen in the form when unsaid. */
export type ContractDraft = {
  kind: "contract";
  contractId: string | null;
  values: Omit<ContractValues, "id" | "ownerPersonId"> & {
    ownerPersonId: string | null;
  };
};

/** A person or an organization of the network, created or edited. */
export type NetworkContactDraft = {
  kind: "networkContact";
  contactId: string | null;
  values: Omit<NetworkContactValues, "id">;
};

/** A task on a launched project's to-do list, written by its owner. */
export type TaskDraft = {
  kind: "task";
  projectId: string;
  projectTitle: string;
  values: {
    title: string;
    assigneePersonId: string | null;
    // "2027-03-12"; empty when not given.
    dueDate: string;
  };
};

/** An internal meeting (a call without a project). */
export type MeetingDraft = {
  kind: "meeting";
  values: {
    title: string;
    // "2026-10-12T15:30" (Paris, datetime-local); empty = the next round hour.
    occurredAtLocal: string;
    meetingUrl: string;
    attendeeIds: string[];
  };
};

/** A new line of a launched project's budget. */
export type BudgetLineDraft = {
  kind: "budgetLine";
  projectId: string;
  projectTitle: string;
  values: {
    label: string;
    // "1500,50"; empty when not given.
    amount: string;
    // Null = not said: the form starts on "Prévu".
    status: BudgetStatus | null;
    family: BudgetFamily | null;
    note: string;
  };
};

export const TITLE_ITEMS = [
  "contributor",
  "session",
  "track",
  "split",
  "rights",
  "declaration",
] as const;
export type TitleItem = (typeof TITLE_ITEMS)[number];

/**
 * A new line of a title's file (credit, session, track, share), its rights,
 * or a declaration to a collecting society: the form of the title page,
 * pre-filled by field name.
 */
export type TitleItemDraft = {
  kind: "titleItem";
  item: TitleItem;
  masterId: string;
  masterTitle: string;
  // The form's fixed choice: the kind of a share, the society declared to.
  splitKind: SplitKind;
  organism: Organism | null;
  defaults: Record<string, string>;
};

export type RecordDraft =
  | ContractTemplateDraft
  | ContractDraft
  | NetworkContactDraft
  | TaskDraft
  | MeetingDraft
  | BudgetLineDraft
  | TitleItemDraft;

export const RECORD_DRAFT_KINDS = [
  "contractTemplate",
  "contract",
  "networkContact",
  "task",
  "meeting",
  "budgetLine",
  "titleItem",
] as const satisfies readonly RecordDraft["kind"][];
