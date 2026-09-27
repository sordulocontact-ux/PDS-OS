import { IconMsgSmile } from "nucleo-sharp-essential";

import { FeedbackCard } from "@/components/feedback/feedback-card";
import { FeedbackItems } from "@/components/feedback/feedback-list";
import { FormMessage } from "@/components/auth/form-message";
import { EmptyState } from "@/components/shell/empty-state";
import type { Feedback, FeedbackTopic } from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";
import { formatLongDay } from "@/lib/project-history/format";

// The director's inbox, one card per topic: PO's title and summary, the
// count and latest date (code), and the original feedback one click away,
// since PO may group wrongly. Feedback PO has not filed yet comes first.
export function FeedbackTopics({
  topics,
  unfiled,
  error,
}: {
  topics: FeedbackTopic[];
  unfiled: Feedback[];
  error: boolean;
}) {
  const t = fr.feedback;
  if (error) return <FormMessage kind="error">{t.loadError}</FormMessage>;
  if (topics.length === 0 && unfiled.length === 0) {
    return (
      <EmptyState
        icon={IconMsgSmile}
        title={t.emptyTitle}
        body={t.emptyReceivedBody}
      />
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
                    <span>{t.count(topic.items.length)}</span>
                    <time dateTime={topic.items[0].createdAt}>
                      {formatLongDay(topic.items[0].createdAt)}
                    </time>
                  </>
                }
              >
                <h3 className="font-medium">{topic.title}</h3>
                <p className="break-words whitespace-pre-line">
                  {topic.summary}
                </p>
                <details>
                  <summary className="w-fit cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    {t.originals(topic.items.length)}
                  </summary>
                  <div className="mt-3">
                    <FeedbackItems items={topic.items} />
                  </div>
                </details>
              </FeedbackCard>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground">{t.byPo}</p>
        </div>
      )}
    </div>
  );
}
