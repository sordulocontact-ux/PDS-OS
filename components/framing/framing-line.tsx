import type { ReactNode } from "react";

import { FactRow } from "@/components/ui/fact-row";
import type { QuestionState } from "@/lib/framing/assess";
import { lineSourceOf, lineStateOf } from "@/lib/framing/lines";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";
import { framingLineTone } from "@/lib/ui/state-tones";

const fr = { framingIntel, framingJourney };

/**
 * One information of the Cadrage (proto `.irow`): « **Libellé** · valeur »
 * (« Pas encore connu » when nothing is), its source, its state pill, and
 * an action on the right.
 * `current`: the question asked above, said once there (« Question en
 * cours » here, never its value twice). `verify`: a proposal of PO checked
 * in the list, « À vérifier » (lib/framing/verify.ts). `href`: the whole
 * line opens it in the question box (Sacha 29/10/2026).
 */
export function FramingLine({
  question,
  lines,
  side,
  current = false,
  verify = false,
  href,
  hrefLabel,
}: {
  question: QuestionState;
  // The lines of a list question, in words.
  lines: string[];
  side?: ReactNode;
  current?: boolean;
  verify?: boolean;
  href?: string | null;
  hrefLabel?: string;
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
        <span>
          <span className="font-semibold">
            {fr.framingIntel.questions[question.key].label}
          </span>
          {" · "}
          {current ? (
            <span className="text-[color:var(--selection)]">
              {t.currentQuestion}
            </span>
          ) : value ? (
            <span className="whitespace-pre-line">{value}</span>
          ) : (
            <span className="text-caption text-muted-foreground">
              {fr.framingJourney.start.notKnown}
            </span>
          )}
        </span>
      }
      source={current ? undefined : lineSourceOf(question)}
      state={{
        tone: framingLineTone[state],
        label: verify ? t.states.to_verify : t.states[state],
      }}
      side={side}
      href={href}
      hrefLabel={hrefLabel}
    />
  );
}
