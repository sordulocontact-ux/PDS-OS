import { IntentionChoices } from "@/components/design/work/intention-choices";
import { AccordionSteps } from "@/components/shell/accordion-steps";
import { routes } from "@/lib/auth/redirects";
import type { ConceptionIntention } from "@/lib/design/conception";
import { DESIGN_TOPICS, type DesignTopic } from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";
import { intentionTopicTone } from "@/lib/ui/state-tones";

/**
 * The four questions of one target, answered like the Stratégie's: numbered
 * rows (name, the answer as summary, its state) unfolded in place one at a
 * time (?q=), closed choices that compose the answer, « Enregistrer » folds
 * the row back. A topic is answered once it has a confirmed intention.
 */
export function IntentionQuestions({
  projectId,
  deliverable,
  confirmed,
  current,
  canWrite,
}: {
  projectId: string;
  // Null: the overall direction.
  deliverable: { id: string; title: string } | null;
  confirmed: ConceptionIntention[];
  current: DesignTopic | null;
  canWrite: boolean;
}) {
  const t = fr.conceptionWork;
  const names = deliverable
    ? fr.conception.topics
    : fr.conception.directionTopics;
  const target = deliverable?.id ?? undefined;
  const answerOf = (topic: DesignTopic) =>
    confirmed.find((i) => i.topic === topic) ?? null;
  const question = (topic: DesignTopic) =>
    deliverable
      ? t.questions.deliverable[topic](deliverable.title)
      : t.questions.direction[topic];
  const open = current ? answerOf(current) : null;

  return (
    <AccordionSteps
      label={t.topicsLabel}
      idPrefix={`intention-${deliverable?.id ?? "direction"}`}
      steps={DESIGN_TOPICS.map((topic) => {
        const answer = answerOf(topic);
        const state = answer ? "complete" : "to_complete";
        return {
          key: topic,
          title: names[topic],
          summary: answer?.value ?? t.notDefined,
          state: {
            label: t.topicStates[state],
            tone: intentionTopicTone[state],
          },
          href: routes.projectDesignWork(projectId, target, topic),
        };
      })}
      current={current}
      closeHref={routes.projectDesignWork(projectId, target)}
      description={current ? t.topicPurposes[current] : undefined}
    >
      {current && (
        <IntentionChoices
          // Remounts when the saved answer changes on the server.
          key={`${current}-${open?.id ?? "none"}`}
          projectId={projectId}
          deliverableId={deliverable?.id ?? null}
          topic={current}
          question={question(current)}
          saved={open?.choices ?? { choices: [], other: null }}
          savedText={open?.value ?? null}
          canWrite={canWrite}
        />
      )}
    </AccordionSteps>
  );
}
