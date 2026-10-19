import type { ReactNode } from "react";

import { FactRow } from "@/components/ui/fact-row";
import type { QuestionState } from "@/lib/framing/assess";
import { lineSourceOf, lineStateOf } from "@/lib/framing/lines";
import { fr } from "@/lib/i18n/fr";
import { framingLineTone } from "@/lib/ui/state-tones";

/**
 * One information of the Cadrage (proto `.irow`): « **Libellé** · valeur »
 * (« Pas encore connu » when nothing is), its source, its state pill, and
 * an action on the right (« Répondre »). `eyebrow`: the dimension, in
 * « Voir le détail ».
 */
export function FramingLine({
  question,
  lines,
  eyebrow,
  side,
}: {
  question: QuestionState;
  // The lines of a list question, in words.
  lines: string[];
  eyebrow?: string;
  side?: ReactNode;
}) {
  const t = fr.framingJourney.dimensions;
  const state = lineStateOf(question);
  const value =
    state === "missing" || state === "na" || state === "later"
      ? null
      : lines.length
        ? lines.join(" · ")
        : question.display;
  return (
    <FactRow
      value={
        <span className="flex flex-col">
          {eyebrow && (
            <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] font-semibold tracking-wide text-[color:var(--text-tertiary)] uppercase">
              {eyebrow}
            </span>
          )}
          <span>
            <span className="font-semibold">
              {fr.framingIntel.questions[question.key].label}
            </span>
            {" · "}
            {value ? (
              <span className="whitespace-pre-line">{value}</span>
            ) : (
              <span className="text-caption text-muted-foreground">
                {fr.framingJourney.start.notKnown}
              </span>
            )}
          </span>
        </span>
      }
      source={lineSourceOf(question)}
      state={{ tone: framingLineTone[state], label: t.states[state] }}
      side={side}
    />
  );
}
