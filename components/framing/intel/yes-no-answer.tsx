"use client";

import { useState, type ReactNode } from "react";

import { LaterForm } from "@/components/framing/intel/answer-states";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { YesNoChoice, type YesNo } from "@/components/ui/yes-no-choice";
import { answerNone } from "@/lib/framing/actions/questions";
import type { QuestionKey } from "@/lib/framing/dimensions";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingIntel, framingJourney };

/**
 * A question answered by a real answer rather than by a way to answer
 * (proto « Les dimensions », Sacha 09/11/2026: « Des dépenses sont-elles déjà
 * engagées ? »): « Oui… » opens what to fill (`yes`: the field, or the lines
 * with their « Ajouter »), « Non… » records the question's « Rien à
 * signaler », « Je ne sais pas encore » asks the date it must be known by
 * (a task is created, as « À définir plus tard »).
 */
export function YesNoAnswer({
  projectId,
  questionKey,
  labels,
  yes,
  onDone,
}: {
  projectId: string;
  questionKey: QuestionKey;
  labels: { yes: string; no: string };
  yes: ReactNode;
  // The gesture done, in words: the confirmation, then the next question.
  onDone: (done: string) => void;
}) {
  const t = fr.framingIntel;
  const g = fr.framingJourney.dimensions.gesture;
  const { pending, run } = useFramingAction();
  const [choice, setChoice] = useState<YesNo | null>(null);
  return (
    <div className="flex flex-col gap-3.5 modern:gap-3">
      <YesNoChoice
        name={`yes-no-${questionKey}`}
        legend={t.yesNoLegend}
        labels={{ ...labels, later: t.notYet }}
        value={choice}
        onChange={setChoice}
        disabled={pending}
      />
      {choice === "yes" && yes}
      {choice === "no" && (
        <div>
          <Button
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={() =>
              run(
                () => answerNone(projectId, questionKey),
                () => onDone(g.saved),
              )
            }
          >
            {t.saveAnswer}
          </Button>
        </div>
      )}
      {choice === "later" && (
        <LaterForm
          projectId={projectId}
          questionKey={questionKey}
          onCancel={() => setChoice(null)}
          onDone={() => onDone(g.later)}
        />
      )}
    </div>
  );
}
