import { IntentionChoices } from "@/components/design/work/intention-choices";
import { AccordionSteps } from "@/components/shell/accordion-steps";
import { routes } from "@/lib/auth/redirects";
import type { ConceptionIntention } from "@/lib/design/conception";
import type { DeliverableFormat } from "@/lib/design/formats";
import { DESIGN_TOPICS, type DesignTopic } from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";
import { intentionTopicTone } from "@/lib/ui/state-tones";

/**
 * The four questions of one target, answered like the Stratégie's: numbered
 * rows (name, the answer as summary, its state) unfolded in place one at a
 * time (?q=), closed choices that compose the answer, « Enregistrer » folds
 * the row back. A topic is answered once it has a confirmed intention.
 * MKT-C2-06: the release's direction asks its own questions (concept,
 * codes, tone, red lines); a deliverable is asked by its format, and a
 * topic the direction answers is inherited — shown, never asked again — its
 * own answer then being an explicit deviation or precision.
 */
export function IntentionQuestions({
  projectId,
  deliverable,
  confirmed,
  inherited,
  current,
  canWrite,
}: {
  projectId: string;
  // Null: the overall direction.
  deliverable: { id: string; title: string; format: DeliverableFormat } | null;
  confirmed: ConceptionIntention[];
  // The direction's confirmed answers, inherited by a deliverable.
  inherited: Partial<Record<DesignTopic, string>>;
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
    !deliverable
      ? t.questions.direction[topic]
      : deliverable.format === "other"
        ? t.questions.deliverable[topic](deliverable.title)
        : t.questions.formats[deliverable.format][topic](deliverable.title);
  const fromDirection = (topic: DesignTopic) =>
    deliverable ? (inherited[topic] ?? null) : null;
  const h = t.inheritance;
  const open = current ? answerOf(current) : null;

  return (
    <AccordionSteps
      label={t.topicsLabel}
      idPrefix={`intention-${deliverable?.id ?? "direction"}`}
      steps={DESIGN_TOPICS.map((topic) => {
        const answer = answerOf(topic);
        const heir = fromDirection(topic);
        const state = answer || heir ? "complete" : "to_complete";
        return {
          key: topic,
          title: names[topic],
          summary: answer?.value ?? (heir ? h.summary(heir) : t.notDefined),
          state: {
            label:
              answer && heir
                ? h.deviates
                : !answer && heir
                  ? h.state
                  : t.topicStates[state],
            tone: intentionTopicTone[state],
          },
          href: routes.projectDesignWork(projectId, target, topic),
        };
      })}
      current={current}
      closeHref={routes.projectDesignWork(projectId, target)}
      description={
        !current
          ? undefined
          : fromDirection(current)
            ? h.note(fromDirection(current)!)
            : deliverable
              ? t.topicPurposes[current]
              : t.directionPurposes[current]
      }
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
