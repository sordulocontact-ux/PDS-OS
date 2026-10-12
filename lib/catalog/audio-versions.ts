// Audio versions of a title (retours Catalogue 07, 10, 13, 18, 19, 24 à 26
// du 11/10/2026, docs/ARCHITECTURE.md § 2 septies, « Versions et
// validation »). The number of a version (Mix V2) is its rank among the
// files of the same step, oldest first: computed here, never typed in the
// file's name. Its validation is the decision recorded on that exact file
// (review_master_audio, or the project's Master workflow): depositing is
// never validating. Pure, client-safe.

import { AUDIO_STATES, type AudioState } from "@/lib/catalog/title-rules";

const rank = (state: AudioState) => AUDIO_STATES.indexOf(state);

export const AUDIO_REVIEWS = ["changes_requested", "approved"] as const;
export type AudioReview = (typeof AUDIO_REVIEWS)[number];

export function audioReviewOf(value: unknown): AudioReview | null {
  return typeof value === "string" &&
    (AUDIO_REVIEWS as readonly string[]).includes(value)
    ? (value as AudioReview)
    : null;
}

export type AudioComment = {
  id: string;
  // The instant of the recording it is about; null = the whole version.
  atSeconds: number | null;
  body: string;
  authorName: string;
  createdAt: string;
};

export type AudioVersion = {
  id: string;
  fileName: string;
  mime: string;
  bytes: number;
  audioState: AudioState;
  durationSeconds: number | null;
  createdAt: string;
  authorName: string;
  review: AudioReview | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewerName: string;
  // A project's workflow refers to it (version of the mix, confirmed source).
  inUse: boolean;
  openUrl: string | null;
  downloadUrl: string | null;
  comments: AudioComment[];
};

/**
 * Where a version stands: its decision, or, without one, « En attente » for
 * the latest of its step and « Non examinée » for an older one (a newer
 * version came instead).
 */
export type AudioValidation = AudioReview | "pending" | "superseded";

export type NumberedVersion = AudioVersion & {
  number: number;
  latestOfStage: boolean;
  // The version it follows in its step (« Mix V1 » for Mix V2).
  previousId: string | null;
  validation: AudioValidation;
};

/** Every version numbered in its step; the most advanced step first, then
 * the newest version first. */
export function numberAudioVersions(
  versions: readonly AudioVersion[],
): NumberedVersion[] {
  const numbered: NumberedVersion[] = [];
  for (const state of AUDIO_STATES) {
    const ofStage = versions
      .filter((v) => v.audioState === state)
      .sort(
        (a, b) =>
          Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
          a.id.localeCompare(b.id),
      );
    ofStage.forEach((v, index) => {
      const latestOfStage = index === ofStage.length - 1;
      numbered.push({
        ...v,
        number: index + 1,
        latestOfStage,
        previousId: index > 0 ? ofStage[index - 1].id : null,
        validation: v.review ?? (latestOfStage ? "pending" : "superseded"),
      });
    });
  }
  return numbered.sort(
    (a, b) => rank(b.audioState) - rank(a.audioState) || b.number - a.number,
  );
}

export type AudioOverview = {
  // The last version deposited, whatever its step.
  latestDeposited: NumberedVersion | null;
  // The last version approved, whatever its step (they may differ).
  latestValidated: NumberedVersion | null;
  // The version of reference: the approved one of the most advanced step.
  reference: NumberedVersion | null;
  // Versions waiting for a decision (the latest of their step).
  pending: NumberedVersion[];
};

export function audioOverview(
  numbered: readonly NumberedVersion[],
): AudioOverview {
  const byDeposit = [...numbered].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  const approved = numbered.filter((v) => v.review === "approved");
  const byDecision = [...approved].sort(
    (a, b) => Date.parse(b.reviewedAt ?? "") - Date.parse(a.reviewedAt ?? ""),
  );
  return {
    latestDeposited: byDeposit[0] ?? null,
    latestValidated: byDecision[0] ?? null,
    // `numbered` is already most advanced step first, newest first.
    reference: approved[0] ?? null,
    pending: numbered.filter((v) => v.validation === "pending"),
  };
}

/**
 * Why a version cannot be deleted (retour 24): an approved one, or one a
 * project's workflow uses, keeps the history of decisions true. The
 * database refuses it the same way (RLS).
 */
export function audioDeleteBlock(
  version: Pick<AudioVersion, "review" | "inUse">,
): "approved" | "inUse" | null {
  if (version.review === "approved") return "approved";
  if (version.inUse) return "inUse";
  return null;
}

/** A version deposited at the wrong step is corrected while nobody
 * examined nor used it (reclassify_master_audio). */
export function canReclassify(
  version: Pick<AudioVersion, "review" | "inUse">,
): boolean {
  return version.review === null && !version.inUse;
}

/** « 1:23 », « 1:02:05 ». */
export function formatTimecode(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`;
}

/** « 1:23 » → 83; « 83 » → 83; anything else → null. */
export function parseTimecode(text: string): number | null {
  const value = text.trim();
  if (/^\d{1,5}$/.test(value)) {
    const n = Number(value);
    return n <= 86399 ? n : null;
  }
  const match = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, h, m, s] = match;
  if (Number(s) > 59 || (h !== undefined && Number(m) > 59)) return null;
  const total = Number(h ?? 0) * 3600 + Number(m) * 60 + Number(s);
  return total <= 86399 ? total : null;
}
