// « PO regroupe les retours en corrections à transmettre » (parcours 17):
// grouped by the code, by category, from the feedback still to handle. No
// model rewrites them: the text is the reviewers' own words. Client-safe.

import { fr } from "@/lib/i18n/fr";
import {
  COMMENT_CATEGORIES,
  isPendingCorrection,
  type CommentCategory,
} from "@/lib/production/post/rules";
import { timecodeLabel, versionName } from "@/lib/production/post/labels";
import type {
  CorrectionRequest,
  PostComment,
  PostVersion,
} from "@/lib/production/post/types";
import { formatDate } from "@/lib/release/format";

const t = fr.productionPost;

export type CorrectionGroup = {
  category: CommentCategory;
  comments: PostComment[];
};

/** By timecode, general comments first, then by date. */
export function byTimecode(a: PostComment, b: PostComment): number {
  if (a.timecodeMs !== b.timecodeMs) {
    if (a.timecodeMs === null) return -1;
    if (b.timecodeMs === null) return 1;
    return a.timecodeMs - b.timecodeMs;
  }
  return a.createdAt.localeCompare(b.createdAt);
}

/** The pending feedback of a version, one group per category in the fixed
 * order; empty categories are left out. */
export function correctionGroups(comments: PostComment[]): CorrectionGroup[] {
  const pending = comments.filter((c) => isPendingCorrection(c.status));
  return COMMENT_CATEGORIES.flatMap((category) => {
    const list = pending
      .filter((c) => c.category === category)
      .sort(byTimecode);
    return list.length > 0 ? [{ category, comments: list }] : [];
  });
}

/** The copyable text sent to the provider. */
export function correctionsText(
  version: Pick<PostVersion, "number" | "label">,
  groups: CorrectionGroup[],
): string {
  return [
    t.corrections.heading(versionName(version)),
    ...groups.flatMap((g) => [
      "",
      t.comments.categories[g.category],
      ...g.comments.map((c) =>
        t.corrections.line(timecodeLabel(c.timecodeMs), c.body),
      ),
    ]),
  ].join("\n");
}

/** The feedback a request carries (the list sent is the list kept). */
export const requestComments = (
  version: Pick<PostVersion, "comments">,
  request: Pick<CorrectionRequest, "id">,
) => version.comments.filter((c) => c.requestId === request.id);

/** The text copied for the provider: the version, the due date, the
 * message, then the feedback kept, grouped by category. */
export function requestText(
  version: Pick<PostVersion, "number" | "label" | "comments">,
  request: Pick<CorrectionRequest, "id" | "dueOn" | "message">,
): string {
  const kept = requestComments(version, request);
  const groups = COMMENT_CATEGORIES.flatMap((category) => {
    const list = kept.filter((c) => c.category === category).sort(byTimecode);
    return list.length > 0 ? [{ category, comments: list }] : [];
  });
  return [
    fr.productionCorrections.heading(
      versionName(version),
      formatDate(request.dueOn),
    ),
    ...(request.message ? ["", request.message] : []),
    ...groups.flatMap((g) => [
      "",
      t.comments.categories[g.category],
      ...g.comments.map((c) =>
        t.corrections.line(timecodeLabel(c.timecodeMs), c.body),
      ),
    ]),
  ].join("\n");
}
