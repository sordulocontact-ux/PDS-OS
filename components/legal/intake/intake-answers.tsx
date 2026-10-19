"use client";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { factLabel } from "@/lib/legal/intake/labels";
import type {
  IntakeQuestion,
  NotAskedQuestion,
} from "@/lib/legal/intake/types";

/**
 * Under « Question de PO », every question at a glance (proto « Projet
 * complet », Cadrage juridique): « n réponses sur N », each answer with what
 * was kept and the words it came from; an open question can be answered
 * now (« Répondre »), an answer corrected once every question has one
 * (« Corriger »: the new answer supersedes, the history stays). Then the
 * questions PO does not ask, settled by reliable data, with their source.
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
  // The question shown above (not repeated as an action).
  activeKey: string | null;
  keyOf: (q: IntakeQuestion) => string;
  onOpen: (q: IntakeQuestion) => void;
}) {
  const t = fr.legal.intake;
  const answered = questions.filter((q) => q.answered).length;
  const done = answered === questions.length;
  const where = (title: string | null) => title ?? t.project;
  return (
    <div className="flex flex-col gap-4">
      {questions.length > 0 && (
        <section
          aria-labelledby="legal-answers"
          className="flex flex-col gap-2"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3
              id="legal-answers"
              className="text-[length:var(--type-body-sm)] font-semibold"
            >
              {t.answers}
            </h3>
            <span className="text-[length:var(--type-micro)] text-[color:var(--text-secondary)] tabular-nums">
              {t.answersOf(answered, questions.length)}
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border border-[color:var(--border-hairline)]">
            {questions.map((q) => {
              const key = keyOf(q);
              const active = key === activeKey;
              return (
                <li
                  key={key}
                  className="flex flex-wrap items-start justify-between gap-3 px-3.5 py-2.5"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-[length:var(--type-body-sm)] font-semibold">
                      {t.questions[q.key].short} · {where(q.title)}
                    </span>
                    {q.answered ? (
                      <ul className="flex flex-col gap-0.5">
                        {(q.facts.length > 0 ? q.facts : []).map((fact, i) => (
                          <li
                            key={i}
                            className="text-[length:var(--type-body-sm)] break-words"
                          >
                            {factLabel(fact, q.key)}
                            {fact.quote && (
                              <span className="text-[length:var(--type-micro)] text-[color:var(--text-secondary)]">
                                {" "}
                                · « {fact.quote} »
                              </span>
                            )}
                          </li>
                        ))}
                        {q.facts.length === 0 && q.lastAnswer && (
                          <li className="text-[length:var(--type-body-sm)] break-words text-[color:var(--text-secondary)]">
                            {t.lastAnswer(q.lastAnswer)}
                          </li>
                        )}
                      </ul>
                    ) : (
                      <span className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
                        {t.toAnswer}
                      </span>
                    )}
                  </div>
                  {!active && (q.answered ? done : true) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpen(q)}
                    >
                      {q.answered ? t.correct : t.answer}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {notAsked.length > 0 && (
        <details className="group rounded-xl border border-[color:var(--border-hairline)] px-3.5 py-2.5">
          <summary className="flex cursor-pointer list-none flex-col marker:hidden">
            <span className="text-[length:var(--type-body-sm)] font-semibold">
              {fr.poQuestion.notAsked.title}
            </span>
            <span className="text-[length:var(--type-micro)] text-[color:var(--text-secondary)]">
              {fr.poQuestion.notAsked.hint}
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
