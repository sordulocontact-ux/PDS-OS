// Versions of the mix and their feedback (lot 6, ticket § 10). Client-safe.

export const MIX_VERSION_STATUSES = ["received", "feedback_sent"] as const;
export type MixVersionStatus = (typeof MIX_VERSION_STATUSES)[number];

/** A version of the mix, or of the mastering (lot 8). */
export const VERSION_STAGES = ["mix", "mastering"] as const;
export type VersionStage = (typeof VERSION_STAGES)[number];

export const MIX_DECISIONS = ["approved", "changes_requested"] as const;
export type MixDecision = (typeof MIX_DECISIONS)[number];

export type MixComment = {
  id: string;
  body: string;
  author: string | null;
  createdAt: string;
};

export type MixVersion = {
  id: string;
  masterId: string;
  number: number;
  fileName: string;
  createdAt: string;
  createdBy: string | null;
  status: MixVersionStatus;
  feedbackSummary: string | null;
  feedbackSentAt: string | null;
  // The validator's decision: approved = the title's Mix final, for good.
  decision: MixDecision | null;
  decisionNote: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  comments: MixComment[];
};

/** The versions of one title, newest first. */
export type TitleMixVersions = {
  masterId: string;
  title: string;
  versions: MixVersion[];
  // The validated version (V3), if any: it never moves.
  finalNumber: number | null;
};

/** What the Mix step reads of the versions. */
export type MixVersionsView = {
  stage: VersionStage;
  titles: TitleMixVersions[];
  failed: boolean;
  // The viewer decides: the brief's validator, or the owner without one.
  canDecide: boolean;
  // Who decides, named on the page.
  decider: string | null;
};
