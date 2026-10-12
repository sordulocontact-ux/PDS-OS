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
  // Where in the track, in seconds (PROJ-BUG-08).
  timecodeSeconds: number | null;
};

export type MixVersion = {
  id: string;
  masterId: string;
  number: number;
  fileName: string;
  // Signed links to listen and download, for whoever reads the version.
  openUrl: string | null;
  downloadUrl: string | null;
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

/** « 1:23 » or « 83 » → 83 seconds; null when it is not a position. */
export function parseTimecode(text: string): number | null {
  const value = text.trim();
  if (!value) return null;
  const match = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$|^(\d{1,5})$/.exec(value);
  if (!match) return Number.NaN;
  if (match[4] !== undefined) return Number(match[4]);
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (seconds > 59 || (match[1] !== undefined && minutes > 59))
    return Number.NaN;
  return hours * 3600 + minutes * 60 + seconds;
}

/** 83 → « 1:23 ». */
export function formatTimecode(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Whether a comment was there when the feedback left (then it is in it). */
export const commentSent = (comment: MixComment, version: MixVersion) =>
  version.feedbackSentAt !== null &&
  comment.createdAt <= version.feedbackSentAt;
