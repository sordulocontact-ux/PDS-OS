"use client";

import { FactRows } from "@/components/ui/fact-row";
import { FactRowFrame } from "@/components/ui/fact-row-frame";
import { StatusBadge } from "@/components/ui/status-badge";
import { legal } from "@/lib/i18n/fr/legal";
import { poQuestion } from "@/lib/i18n/fr/po-question";
import { factLabel } from "@/lib/legal/intake/labels";
import type {
  IntakeQuestion,
  NotAskedQuestion,
} from "@/lib/legal/intake/types";
import { StepSection } from "@/components/shell/journey/step-section";

const fr = { poQuestion, legal };

/**
 * Under PO's box, every question at a glance (proto « Projet complet »,
 * Cadrage juridique), as the Master's Brief shows its facts: « n réponses
 * sur N », one row per question, what was kept and, under it, the words it
 * came from; « À répondre » on the right while unanswered. A click on the
 * whole row opens its question in the box above, no verb written, the
 * row's tint on hover says it (Sacha 06/11/2026, as the Brief); the
 * question open there is the tinted row. Then the questions PO does not
 * ask, settled by reliable data, with their source.
 */
export function IntakeAnswers({
  questions,
  notAsked,
  activeKey,
  keyOf,
  onOpen,
}: {
  questions: IntakeQuestion[];
  notAsked: NotAskedQuestion[];
  // The question open in the box above.
  activeKey: string | null;
  keyOf: (q: IntakeQuestion) => string;
  onOpen: (q: IntakeQuestion) => void;
}) {
  const t = fr.legal.intake;
  const answered = questions.filter((q) => q.answered).length;
  // The title said on a row only when there are several (as the
  // Confirmation), the project-wide question then reading « Projet ».
  const several =
    new Set(questions.flatMap((q) => (q.title ? [q.title] : []))).size > 1;
  const labelOf = (q: IntakeQuestion) =>
    several
      ? `${t.questions[q.key].short} · ${q.title ?? t.project}`
      : t.questions[q.key].short;
  return (
    <div className="flex flex-col gap-4">
      {questions.length > 0 && (
        <StepSection
          title={t.answers}
          aside={
            <span className="text-[length:var(--type-micro)] text-[color:var(--text-secondary)] tabular-nums">
              {t.answersOf(answered, questions.length)}
            </span>
          }
        >
          <FactRows>
            {questions.map((q) => {
              const key = keyOf(q);
              const current = key === activeKey;
              return (
                <FactRowFrame
                  key={key}
                  label={labelOf(q)}
                  value={answerOf(q)}
                  source={quotesOf(q)}
                  // Not answered: « À répondre » on the right, as the
                  // Master's « À renseigner »; the question in the box is
                  // the tinted row, no badge (as the Cadrage, 09/11/2026).
                  missing={!q.answered}
                  missingAs="badge"
                  missingLabel={t.toAnswerPill}
                  current={current}
                  onClick={() => onOpen(q)}
                  hrefLabel={q.answered ? t.edit : t.answer}
                />
              );
            })}
          </FactRows>
        </StepSection>
      )}
      {notAsked.length > 0 && (
        <details className="group rounded-xl border border-[color:var(--border-hairline)] bg-card px-3.5 py-2.5">
          <summary className="flex cursor-pointer list-none flex-col marker:hidden">
            <span className="text-[length:var(--type-body-sm)] font-semibold">
              {fr.poQuestion.notAsked.title}
            </span>
          </summary>
          <ul className="flex flex-col gap-2 pt-3">
            {notAsked.map((q) => (
              <li
                key={`${q.key}:${q.masterId ?? "project"}`}
                className="flex flex-wrap items-start justify-between gap-2"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-[length:var(--type-body-sm)] break-words">
                    {t.questions[q.key].ask(q.title ?? "")}
                  </span>
                  <span className="text-[length:var(--type-micro)] text-[color:var(--text-secondary)]">
                    {[q.value, q.source].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <StatusBadge tone="success" size="sm">
                  {fr.legal.confirmation.states.answer.known}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** What an answer kept, one fact a line (or the words, when PO kept none). */
function answerOf(q: IntakeQuestion) {
  const t = fr.legal.intake;
  if (!q.answered) return null;
  if (q.facts.length === 0)
    return q.lastAnswer ? t.lastAnswer(q.lastAnswer) : null;
  return (
    <span className="flex flex-col gap-0.5">
      {q.facts.map((fact, i) => (
        <span key={i}>{factLabel(fact, q.key)}</span>
      ))}
    </span>
  );
}

/** The words the facts came from, under the value (the row's source). */
function quotesOf(q: IntakeQuestion) {
  const quotes = q.facts.flatMap((f) => (f.quote ? [`« ${f.quote} »`] : []));
  return quotes.length > 0 ? quotes.join(" · ") : null;
}
