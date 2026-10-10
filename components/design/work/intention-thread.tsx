"use client";

import { useState } from "react";

import { PoBubble, UserBubble } from "@/components/design/work/bubbles";
import { IntentionComposer } from "@/components/design/work/intention-composer";
import { useDesignAction } from "@/components/design/work/use-design-action";
import { Button } from "@/components/ui/button";
import { saveDesignIntention } from "@/lib/design/actions/intentions";
import {
  DESIGN_TOPICS,
  missingTopics,
  type DesignTopic,
} from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";

/**
 * The conversation with PO about one target: every answered topic (its
 * question, the answer, « Modifier »), then only the first topic still
 * missing — one question at a time. « Plus tard » moves on for this visit;
 * nothing is stored for a skipped question.
 */
export function IntentionThread({
  projectId,
  deliverableId,
  title,
  confirmed,
  canWrite,
}: {
  projectId: string;
  // Null: the overall direction.
  deliverableId: string | null;
  // The deliverable's title, named in the questions; null for the direction.
  title: string | null;
  confirmed: Array<{ topic: DesignTopic; value: string }>;
  canWrite: boolean;
}) {
  const t = fr.conceptionWork;
  const { pending, run } = useDesignAction();
  const [editing, setEditing] = useState<DesignTopic | null>(null);
  const [skipped, setSkipped] = useState<DesignTopic[]>([]);

  const question = (topic: DesignTopic) =>
    title
      ? t.questions.deliverable[topic](title)
      : t.questions.direction[topic];
  const save = (topic: DesignTopic, text: string, onSuccess?: () => void) =>
    run(() => saveDesignIntention(projectId, deliverableId, topic, text), {
      success: t.composer.saved,
      onSuccess,
    });

  const missing = missingTopics(confirmed);
  const open = missing.filter((topic) => !skipped.includes(topic));
  const current = canWrite ? open[0] : undefined;
  const idOf = (topic: DesignTopic) =>
    `design-intention-${deliverableId ?? "direction"}-${topic}`;

  return (
    <div className="flex flex-col gap-5" aria-live="polite">
      {DESIGN_TOPICS.map((topic) => {
        const answer = confirmed.find((i) => i.topic === topic);
        if (!answer) return null;
        return (
          <div key={topic} className="flex flex-col gap-3">
            <PoBubble>
              <p>{question(topic)}</p>
            </PoBubble>
            {editing === topic ? (
              <IntentionComposer
                id={idOf(topic)}
                defaultValue={answer.value}
                pending={pending}
                submitLabel={t.composer.save}
                onSubmit={(text) => save(topic, text, () => setEditing(null))}
                secondary={
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditing(null)}
                  >
                    {t.composer.cancel}
                  </Button>
                }
              />
            ) : (
              <UserBubble
                action={
                  canWrite && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setEditing(topic)}
                    >
                      {t.composer.edit}
                    </Button>
                  )
                }
              >
                {answer.value}
              </UserBubble>
            )}
          </div>
        );
      })}

      {current ? (
        <div className="flex flex-col gap-3">
          <PoBubble>
            <p className="font-semibold">{question(current)}</p>
            {open.length > 1 && (
              <p className="text-caption text-muted-foreground">
                {t.questions.remaining(open.length - 1)}
              </p>
            )}
          </PoBubble>
          <IntentionComposer
            key={current}
            id={idOf(current)}
            pending={pending}
            submitLabel={t.composer.send}
            onSubmit={(text) => save(current, text)}
            secondary={
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSkipped((list) => [...list, current])}
              >
                {t.composer.later}
              </Button>
            }
          />
        </div>
      ) : missing.length === 0 ? (
        <PoBubble>
          <p>{title ? t.questions.allDone : t.questions.allDoneDirection}</p>
        </PoBubble>
      ) : (
        canWrite && (
          <PoBubble>
            <p>{t.questions.skipped}</p>
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setSkipped([])}
            >
              {t.questions.restart}
            </Button>
          </PoBubble>
        )
      )}
    </div>
  );
}
