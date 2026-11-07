import Link from "next/link";
import { IconMsgSmile } from "nucleo-sharp-essential";

import { EditFeedbackButton } from "@/components/feedback/edit-feedback-button";
import { FeedbackCard } from "@/components/feedback/feedback-card";
import { EmptyState } from "@/components/shell/empty-state";
import { ImageGallery } from "@/components/ui/image-gallery";
import { FormMessage } from "@/components/auth/form-message";
import type { Feedback } from "@/lib/feedback/types";
import { feedback } from "@/lib/i18n/fr/feedback";
import { formatLongDay, formatTime } from "@/lib/project-history/format";

const fr = { feedback };

// Feedback as it was sent, newest first: kind, when, who (someone else's
// only), the page it came from and, for the director, the topic PO filed it
// in; then the message as it was written and its screenshots.
// `editable`: the viewer's own feedback, which they may still change.
export function FeedbackItems({
  items,
  showTopic = false,
  editable = false,
}: {
  items: Feedback[];
  showTopic?: boolean;
  editable?: boolean;
}) {
  const t = fr.feedback;
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item) => (
        <FeedbackCard
          key={item.id}
          kind={item.kind}
          action={
            editable && (
              <EditFeedbackButton
                feedback={{
                  id: item.id,
                  kind: item.kind,
                  message: item.message,
                  screenshots: item.screenshots,
                }}
                label={t.mineEdit.actionOf(
                  `${formatLongDay(item.createdAt)}, ${formatTime(item.createdAt)}`,
                )}
              />
            )
          }
          facts={
            <>
              <time dateTime={item.createdAt}>
                {formatLongDay(item.createdAt)}, {formatTime(item.createdAt)}
              </time>
              {item.editedAt && (
                <time dateTime={item.editedAt}>
                  {t.edited(
                    `${formatLongDay(item.editedAt)}, ${formatTime(item.editedAt)}`,
                  )}
                </time>
              )}
              {item.authorName && <span>{t.from(item.authorName)}</span>}
              {item.pagePath && (
                <Link
                  href={item.pagePath}
                  className="font-mono break-all underline-offset-2 hover:text-foreground hover:underline"
                >
                  {item.pagePath}
                </Link>
              )}
            </>
          }
        >
          <p className="max-w-prose break-words whitespace-pre-line">
            {item.message}
          </p>
          {item.screenshots.length > 0 && (
            <ImageGallery
              images={item.screenshots.map(({ path, url }, index) => ({
                key: path,
                src: url,
                alt: t.screenshot.altOf(index + 1),
                openLabel: t.screenshot.openOf(index + 1),
                title: t.screenshot.titleOf(index + 1, item.screenshots.length),
              }))}
              labels={t.screenshot.viewer}
            />
          )}
          {showTopic && (
            <p className="text-sm text-muted-foreground">
              {item.topicTitle ? t.topicOf(item.topicTitle) : t.unfiled}
            </p>
          )}
        </FeedbackCard>
      ))}
    </ol>
  );
}

// The same list with its failure and empty states.
export function FeedbackList({
  items,
  error,
  received,
}: {
  items: Feedback[];
  error: boolean;
  // The viewer reads the whole team's feedback, not only their own.
  received: boolean;
}) {
  const t = fr.feedback;
  if (error) return <FormMessage kind="error">{t.loadError}</FormMessage>;
  if (items.length === 0) {
    return (
      <EmptyState
        icon={IconMsgSmile}
        title={t.emptyTitle}
        body={received ? t.emptyReceivedBody : t.emptyBody}
      />
    );
  }
  return (
    <FeedbackItems items={items} showTopic={received} editable={!received} />
  );
}
