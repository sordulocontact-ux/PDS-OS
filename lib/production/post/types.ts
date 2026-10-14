// What the Postproduction tab reads (lib/production/post/queries.ts), in the
// shape the components display. Client-safe (types only).

import type { Member } from "@/lib/framing/related";
import type { Holder, NetworkOption } from "@/lib/production/sheet";
import type {
  CommentCategory,
  CommentStatus,
  PostStepKey,
  PostStepStatus,
  ReferenceKind,
  VersionStatus,
} from "@/lib/production/post/rules";

export type PostFile = { id: string; fileName: string; href: string | null };

export type PostReference = {
  id: string;
  kind: ReferenceKind;
  title: string | null;
  url: string | null;
  note: string | null;
  file: PostFile | null;
  createdAt: string;
  // Who added it (PROD-034).
  createdBy: string | null;
};

export type PostStep = {
  id: string;
  key: PostStepKey;
  label: string | null;
  holder: Holder | null;
  responsibilities: string | null;
  accessNote: string | null;
  startsOn: string | null;
  endsOn: string | null;
  status: PostStepStatus;
};

export type PostComment = {
  id: string;
  timecodeMs: number | null;
  category: CommentCategory;
  body: string;
  status: CommentStatus;
  statusBy: string | null;
  statusAt: string | null;
  authorName: string;
  createdAt: string;
  file: PostFile | null;
  // The correction request it was sent with, if any (PROD-030).
  requestId: string | null;
};

export type CorrectionStatus = "draft" | "sent" | "viewed" | "treated";

/** A provider's current private link (PROD-026). */
export type ProviderLinkState = {
  createdAt: string;
  expiresAt: string;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
};

/** « Demander des corrections », addressed to someone (PROD-031). */
export type CorrectionRequest = {
  id: string;
  recipient: Holder;
  dueOn: string;
  message: string | null;
  status: CorrectionStatus;
  sentBy: string | null;
  sentAt: string | null;
  reminders: number;
  viewedAt: string | null;
  treatedAt: string | null;
  treatedVersionNumber: number | null;
};

export type PostVersion = {
  id: string;
  number: number;
  label: string | null;
  file: PostFile | null;
  url: string | null;
  notes: string | null;
  // The provider who made it: kept when another provider takes over.
  author: Holder | null;
  status: VersionStatus;
  createdBy: string;
  createdAt: string;
  submittedBy: string | null;
  submittedAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  // Sorted by timecode, general comments first.
  comments: PostComment[];
  // The version it follows in the cycle (PROD-032).
  previousNumber: number | null;
  request: CorrectionRequest | null;
};

/** What the shoot report left missing (declarations not made once the shoot
 * took place, sequences missing) and the incidents a person said block the
 * postproduction. */
export type ShootAlert = {
  noVideoRushes: boolean;
  noAudioSources: boolean;
  noBackup: boolean;
  missingSequences: string | null;
  blockingIncidents: string[];
};

export type PostProductionData = {
  references: PostReference[];
  steps: PostStep[];
  // Newest first.
  versions: PostVersion[];
  shootAlert: ShootAlert | null;
  canReview: boolean;
  // Who takes the decision on a version: the owner and the project's
  // creative directors (PROD-033).
  reviewers: string[];
  // The current private link of each provider, by Réseau contact (PROD-026).
  providerLinks: Record<string, ProviderLinkState>;
};

/** Where a write goes: the project, its sheet, and the organisation the
 * browser uploads files under (lib/production/files/upload.ts). */
export type PostScope = {
  projectId: string;
  sheetId: string;
  organizationId: string;
};

/** What a new version starts from: the editing step's provider as its
 * author, and the number the database will give it. */
export type VersionDefaults = { author: Holder | null; nextNumber: number };

/** Who may do a step or have made a version: PDS's members and the Réseau. */
export type PostPeople = { members: Member[]; contacts: NetworkOption[] };
