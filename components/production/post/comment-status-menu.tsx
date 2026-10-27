"use client";

import { IconCheck } from "nucleo-sharp-essential";
import { useTransition } from "react";
import { toast } from "sonner";

import { RowActions } from "@/components/ui/row-actions";
import { productionPost } from "@/lib/i18n/fr/production-post";
import { setPostCommentStatus } from "@/lib/production/post/review-actions";
import { commentMoves, type CommentStatus } from "@/lib/production/post/rules";

const fr = { productionPost };

const t = fr.productionPost.comments;

/** « ⋯ » of a feedback: the statuses it may move to (a correction declared
 * fixed is verified before it is resolved). */
export function CommentStatusMenu({
  projectId,
  commentId,
  status,
  line,
}: {
  projectId: string;
  commentId: string;
  status: CommentStatus;
  // Names the feedback for screen readers (its timecode).
  line: string;
}) {
  const [pending, startTransition] = useTransition();
  const move = (next: CommentStatus) =>
    startTransition(async () => {
      const result = await setPostCommentStatus({
        projectId,
        commentId,
        status: next,
      });
      if (result.ok) toast.success(t.statusDone);
      else toast.error(result.error);
    });

  return (
    <div aria-busy={pending || undefined}>
      <RowActions
        label={t.menu(line)}
        actions={commentMoves(status).map((next) => ({
          key: next,
          label: t.moves[next],
          icon: IconCheck,
          onSelect: () => move(next),
        }))}
      />
    </div>
  );
}
