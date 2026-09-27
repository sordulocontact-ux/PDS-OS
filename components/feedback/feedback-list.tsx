import Link from "next/link";
import { IconMsgSmile } from "nucleo-sharp-essential";

import { FeedbackCard } from "@/components/feedback/feedback-card";
import { EmptyState } from "@/components/shell/empty-state";
import { FormMessage } from "@/components/auth/form-message";
import type { Feedback } from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";
import { formatLongDay, formatTime } from "@/lib/project-history/format";

// Feedback as it was sent, newest first: kind, when, who (someone else's
// only), the page it came from and, for the director, the topic PO filed it
// in; then the message as it was written and its screenshot.
export function FeedbackItems({
  items,
  showTopic = false,
}: {
  items: Feedback[];
  showTopic?: boolean;
}) {
  const t = fr.feedback;
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item) => (
        <FeedbackCard
          key={item.id}
          kind={item.kind}
          facts={
            <>
              <time dateTime={item.createdAt}>
                {formatLongDay(item.createdAt)}, {formatTime(item.createdAt)}
              </time>
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
          <p className="break-words whitespace-pre-line">{item.message}</p>
          {item.screenshotUrl && (
            <a
              href={item.screenshotUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t.screenshot.open}
              className="w-fit"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL of a private bucket */}
              <img
                src={item.screenshotUrl}
                alt={t.screenshot.alt}
                loading="lazy"
                className="max-h-40 max-w-full rounded-lg border border-border object-contain"
              />
            </a>
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
  return <FeedbackItems items={items} showTopic={received} />;
}
