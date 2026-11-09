import type { ReactNode } from "react";

import { FactRow, type FactSource } from "@/components/ui/fact-row";
import { FactSourceText } from "@/components/ui/fact-row-frame";
import type { QuestionState } from "@/lib/framing/assess";
import { lineSourceOf, lineStateOf } from "@/lib/framing/lines";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";
import { framingLineTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

const fr = { framingIntel, framingJourney };

/**
 * A line's label and its value in two columns, the source under the value
 * (proto « Les dimensions », Sacha 09/11/2026: « Libellé · valeur » glued
 * together read as one sentence); the label above the value on a phone.
 */
export function LineColumns({
  label,
  value,
  source,
}: {
  label: string;
  value: ReactNode;
  source?: FactSource | null;
}) {
  return (
    <span className="grid gap-x-3 gap-y-0.5 md:grid-cols-[11rem_minmax(0,1fr)]">
      <span className="text-caption text-[color:var(--text-secondary)] md:leading-[var(--type-body-sm-lh)]">
        {label}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        {value}
        <FactSourceText source={source} />
      </span>
    </span>
  );
}

/**
 * One information of the Cadrage (proto `.irow`): its label and value
 * (« Pas encore connu » when nothing is), its source, and on its right only
 * what it still needs — « À vérifier » for a proposal of PO checked in the
 * list (`verify`, lib/framing/verify.ts), « Répondre » for the one who
 * answers (`mine`), else « À répondre »; nothing once it is done, « Plus
 * tard » and « Non applicable » being said by its source (Sacha 09/11/2026). `href`: the whole line opens it in place, under
 * itself, the page staying still; `open`: it is open, in light grey, and a
 * click closes it.
 */
export function FramingLine({
  question,
  lines,
  side,
  verify = false,
  mine = false,
  open = false,
  href,
  hrefLabel,
}: {
  question: QuestionState;
  // The lines of a list question, in words.
  lines: string[];
  side?: ReactNode;
  verify?: boolean;
  // The viewer answers it.
  mine?: boolean;
  open?: boolean;
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
  // « Plus tard » and « Non applicable » say themselves in the source.
  const says =
    state === "missing"
      ? mine
        ? t.lineStates.answer
        : t.lineStates.toAnswer
      : null;
  return (
    <FactRow
      value={
        <LineColumns
          label={fr.framingIntel.questions[question.key].label}
          value={
            value ? (
              <span className="whitespace-pre-line">{value}</span>
            ) : (
              <span className="text-[color:var(--text-tertiary)]">
                {fr.framingJourney.start.notKnown}
              </span>
            )
          }
          source={lineSourceOf(question)}
        />
      }
      state={
        verify || state === "to_confirm"
          ? { tone: framingLineTone.to_confirm, label: t.states.to_verify }
          : null
      }
      side={
        (says || side) && (
          <>
            {says && !open && (
              <span
                className={cn(
                  "text-caption whitespace-nowrap",
                  state === "missing" && mine
                    ? "font-semibold text-[color:var(--selection)]"
                    : "text-[color:var(--text-secondary)]",
                )}
              >
                {says}
              </span>
            )}
            {side}
          </>
        )
      }
      href={href}
      hrefLabel={hrefLabel}
      current={open}
      keepScroll
    />
  );
}
