import { IconMsgSmile } from "nucleo-sharp-essential";

import { FeedbackCard } from "@/components/feedback/feedback-card";
import { FeedbackItems } from "@/components/feedback/feedback-list";
import { TopicActions } from "@/components/feedback/topic-actions";
import { FormMessage } from "@/components/auth/form-message";
import { EmptyState } from "@/components/shell/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Feedback, FeedbackTopic } from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";
import { formatLongDay } from "@/lib/project-history/format";
import { feedbackPriorityTone } from "@/lib/ui/state-tones";

// The director's topics of one view, one card each: PO's title and summary,
// the count and latest date (code), the priority and who sent it once sent,
// the decision buttons, and the original feedback one click away, since PO
// may group wrongly. Feedback PO has not filed yet comes first.
export function FeedbackTopics({
  topics,
  unfiled = [],
  error,
  emptyBody,
  notion = false,
}: {
  topics: FeedbackTopic[];
  unfiled?: Feedback[];
  error: boolean;
  emptyBody: string;
  // Notion is configured: sent topics are published there.
  notion?: boolean;
}) {
  const t = fr.feedback;
  if (error) return <FormMessage kind="error">{t.loadError}</FormMessage>;
  if (topics.length === 0 && unfiled.length === 0) {
    return (
      <EmptyState icon={IconMsgSmile} title={t.emptyTitle} body={emptyBody} />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {unfiled.length > 0 && (
        <section aria-labelledby="feedback-unfiled" className="grid gap-3">
          <h3 id="feedback-unfiled" className="text-sm text-muted-foreground">
            {t.unfiled}
          </h3>
          <FeedbackItems items={unfiled} />
        </section>
      )}
      {topics.length > 0 && (
        <div className="grid gap-3">
          <ol className="flex flex-col gap-3">
            {topics.map((topic) => (
              <FeedbackCard
                key={topic.id}
                kind={topic.kind}
                facts={
                  <>
                    {topic.priority && (
                      <StatusBadge
                        tone={feedbackPriorityTone[topic.priority]}
                        size="sm"
                      >
                        {t.priority(t.priorities[topic.priority])}
                      </StatusBadge>
                    )}
                    <span>{t.count(topic.items.length)}</span>
                    <time dateTime={topic.items[0].createdAt}>
                      {formatLongDay(topic.items[0].createdAt)}
                    </time>
                  </>
                }
              >
                <h3 className="font-medium">{topic.title}</h3>
                <p className="max-w-prose break-words whitespace-pre-line">
                  {topic.summary}
                </p>
                {topic.editedAt && (
                  <p className="text-sm text-muted-foreground">
                    {t.editedBy(
                      formatLongDay(topic.editedAt),
                      topic.editorName ?? "—",
                    )}
                  </p>
                )}
                {topic.status === "sent" && topic.reviewedAt && (
                  <p className="text-sm text-muted-foreground">
                    {t.sentBy(
                      formatLongDay(topic.reviewedAt),
                      topic.reviewerName ?? "—",
                    )}
                    {topic.newSinceReview > 0 &&
                      ` · ${t.newSinceSent(topic.newSinceReview)}`}
                    {notion &&
                      (topic.notionSynced
                        ? topic.newSinceSync > 0 &&
                          ` · ${t.notion.newSinceSync(topic.newSinceSync)}`
                        : ` · ${t.notion.notSynced}`)}
                  </p>
                )}
                {topic.status === "sent" && topic.notionError && (
                  <p
                    role="alert"
                    className="text-sm text-[color:var(--tone-danger-fg)]"
                  >
                    {t.notion.error(topic.notionError)}
                  </p>
                )}
                <details>
                  <summary className="w-fit cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    {t.originals(topic.items.length)}
                  </summary>
                  <div className="mt-3">
                    <FeedbackItems items={topic.items} />
                  </div>
                </details>
                <TopicActions topic={topic} notion={notion} />
              </FeedbackCard>
            ))}
          </ol>
          {topics.some((topic) => !topic.editedAt) && (
            <p className="text-sm text-muted-foreground">{t.byPo}</p>
          )}
        </div>
      )}
    </div>
  );
}
