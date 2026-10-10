import { IconPaperclip } from "nucleo-sharp-essential";

import { EmptyNote } from "@/components/shell/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { timecodeLabel } from "@/lib/production/post/labels";
import type { PostComment } from "@/lib/production/post/types";
import { formatDateTime } from "@/lib/release/format";
import { versionCommentTone } from "@/lib/ui/state-tones";

import { CommentStatusMenu } from "./comment-status-menu";

const t = fr.productionPost.comments;

/** The feedback of one version, by timecode (general comments first): who,
 * when, the category, the status and who set it, the attachment. */
export function CommentList({
  projectId,
  comments,
  canReview,
}: {
  projectId: string;
  comments: PostComment[];
  canReview: boolean;
}) {
  if (comments.length === 0) return <EmptyNote>{t.none}</EmptyNote>;
  return (
    <ul className="flex flex-col gap-4">
      {comments.map((c) => {
        const line = timecodeLabel(c.timecodeMs);
        return (
          <li key={c.id} className="flex items-start gap-3">
            <span className="w-16 shrink-0 pt-0.5 text-sm font-semibold tabular-nums">
              {line}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="neutral" size="sm">
                  {t.categories[c.category]}
                </StatusBadge>
                <StatusBadge tone={versionCommentTone[c.status]} size="sm">
                  {t.statuses[c.status]}
                </StatusBadge>
              </div>
              <p className="break-words whitespace-pre-line">{c.body}</p>
              {c.file?.href && (
                <a
                  href={c.file.href}
                  className="inline-flex w-fit items-center gap-1 text-sm underline underline-offset-4"
                >
                  <IconPaperclip aria-hidden className="size-4" />
                  {t.attachmentOpen} · {c.file.fileName}
                </a>
              )}
              <p className="text-sm text-muted-foreground">
                {t.statusLine(c.authorName, formatDateTime(c.createdAt))}
                {c.status !== "open" && c.statusBy && c.statusAt && (
                  <>
                    {" · "}
                    {t.statuses[c.status]} :{" "}
                    {t.statusLine(c.statusBy, formatDateTime(c.statusAt))}
                  </>
                )}
              </p>
            </div>
            {canReview && (
              <CommentStatusMenu
                projectId={projectId}
                commentId={c.id}
                status={c.status}
                line={line}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
