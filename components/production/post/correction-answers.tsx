import { productionCorrections } from "@/lib/i18n/fr/production-corrections";
import { requestComments } from "@/lib/production/post/corrections";
import type { PostVersion } from "@/lib/production/post/types";

import { CommentList } from "./comment-list";

const fr = { productionCorrections };

const t = fr.productionCorrections;

/**
 * On a version that follows a correction request (PROD-032): what the
 * previous version had to correct, each feedback with its status, so the
 * reviewers mark it resolved or reopen it on this new version.
 */
export function CorrectionAnswers({
  projectId,
  previous,
  canReview,
}: {
  projectId: string;
  previous: PostVersion;
  canReview: boolean;
}) {
  const request = previous.request;
  if (!request) return null;
  const asked = requestComments(previous, request);
  if (asked.length === 0) return null;
  return (
    <section className="flex flex-col gap-2 rounded-xl bg-muted/50 p-4">
      <div className="flex flex-col gap-0.5">
        <h4 className="text-sm font-semibold">
          {t.answersTitle(previous.number)}
        </h4>
        <p className="text-xs text-muted-foreground">{t.answersHint}</p>
      </div>
      <CommentList
        projectId={projectId}
        comments={asked}
        canReview={canReview}
      />
    </section>
  );
}
