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
};

/** Where a write goes: the project, its sheet, and the organisation the
 * browser uploads files under (lib/production/files/upload.ts). */
export type PostScope = {
  projectId: string;
  sheetId: string;
  organizationId: string;
};

/** Who may do a step or have made a version: PDS's members and the Réseau. */
export type PostPeople = { members: Member[]; contacts: NetworkOption[] };
