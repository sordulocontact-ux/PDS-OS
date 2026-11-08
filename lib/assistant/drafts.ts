// Drafts proposed by PO (docs/ASSISTANT.md § 3 bis). A draft is never
// written: it pre-fills the real form, a person reviews it and saves with
// their own session. Client-safe.

import {
  RECORD_DRAFT_KINDS,
  type RecordDraft,
} from "@/lib/assistant/draft-records";
import type {
  ArtistRelation,
  DeezerArtistResult,
  Credit,
  MasterFormDefaults,
} from "@/lib/catalog/types";
import type { ContactRole } from "@/lib/catalog/contacts";
import type {
  FeedbackKind,
  FeedbackPriority,
  TopicAction,
} from "@/lib/feedback/types";
import type {
  ContentMode,
  MusicFormat,
  Priority,
  ProjectType,
} from "@/lib/projects/types";

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
    // Null = not said: the person chooses in the form.
    relation: ArtistRelation | null;
    notes: string | null;
    legalName: string | null;
    countryCode: string | null;
    bio: string | null;
  };
  contacts: ContactDraft[];
  // A new artist: the one Deezer profile of that name, found by the code
  // (retour d'Ibé du 31/10/2026); absent on drafts saved before.
  deezer?: DeezerArtistResult | null;
};

export type MasterDraft = {
  kind: "master";
  masterId: string | null;
  // The title form's values (audio state and variant only when said).
  values: MasterFormDefaults & {
    credits: Credit[];
    // Artists named but not in the catalogue yet (proposed in the same
    // answer): picked by name when the form opens, once created (UX test of
    // 09/10/2026: artist → titles → project, nothing carried over).
    pendingCredits?: Array<{ name: string; role: Credit["role"] }>;
  };
};

export type ProjectDraft = {
  kind: "project";
  projectId: string | null;
  values: {
    title: string;
    type: ProjectType | null;
    musicFormat: MusicFormat | null;
    contentMode: ContentMode | null;
    contentFormatId: string | null;
    artistId: string | null;
    masterIds: string[];
    // Named but not created yet (same answer): picked when the form opens.
    pendingArtist?: string | null;
    pendingMasters?: string[];
    // Creation only: the team of a created project changes by transmission.
    assigneePersonId: string | null;
    creativePersonIds: string[];
    // "2027-03-12", "1500,50"; empty when not given.
    dueDate: string;
    budget: string;
    priority: Priority | null;
    initialContext: string;
  };
};

/** A feedback about the app, sent to the director (any member). */
export type FeedbackDraft = {
  kind: "feedback";
  values: {
    feedbackKind: FeedbackKind;
    message: string;
    // The page PO was opened from, when it is a page of the app.
    pagePath: string | null;
  };
};

/** The director's edit of a topic before sending it. */
export type FeedbackTopicDraft = {
  kind: "feedbackTopic";
  topicId: string;
  values: { feedbackKind: FeedbackKind; title: string; summary: string };
};

/** The director's decision on a topic; the priority only when the user said it. */
export type FeedbackReviewDraft = {
  kind: "feedbackReview";
  topicId: string;
  topicTitle: string;
  action: TopicAction;
  priority: FeedbackPriority | null;
};

export type Draft =
  | ArtistDraft
  | MasterDraft
  | ProjectDraft
  | FeedbackDraft
  | FeedbackTopicDraft
  | FeedbackReviewDraft
  | RecordDraft;

export type DraftProposal = {
  draft: Draft;
  // What the draft would write, for the card; warnings are what PO could not do.
  title: string;
  changes: DraftChange[];
  warnings: string[];
};

const KINDS = new Set([
  "artist",
  "master",
  "project",
  "feedback",
  "feedbackTopic",
  "feedbackReview",
  ...RECORD_DRAFT_KINDS,
]);

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
