"use client";

import { IconCheck } from "nucleo-sharp-essential";
import { useState } from "react";

import { AnsweredList } from "@/components/legal/intake/answered-list";
import { QuestionCard } from "@/components/legal/intake/question-card";
import { EmptyState } from "@/components/shell/empty-state";
import { fr } from "@/lib/i18n/fr";
import { answerKey } from "@/lib/legal/intake/questions";
import type { IntakeQuestion } from "@/lib/legal/intake/types";

const keyOf = (q: IntakeQuestion) => answerKey(q.key, q.masterId);

/**
 * The Cadrage juridique's conversation: the first open question (in the
 * order the code decided), or the one being corrected; then the answers.
 * The server sends the questions again after each save, so the next one
 * comes by itself.
 */
export function IntakeWorkspace({
  projectId,
  questions,
  initialQuestion,
}: {
  projectId: string;
  questions: IntakeQuestion[];
  // `?question=<key>:<title|project>` (from the Confirmation's « Corriger »
  // or « Répondre »): that question opens first.
  initialQuestion: string | null;
}) {
  const t = fr.legal.intake;
  const [correcting, setCorrecting] = useState<string | null>(
    initialQuestion && questions.some((q) => keyOf(q) === initialQuestion)
      ? initialQuestion
      : null,
  );
  const corrected = correcting
    ? questions.find((q) => keyOf(q) === correcting)
    : undefined;
  const active = corrected ?? questions.find((q) => !q.answered);
  const answered = questions.filter((q) => q.answered);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <p className="text-sm text-muted-foreground tabular-nums">
        {t.progress(answered.length, questions.length)}
      </p>
      {active ? (
        <QuestionCard
          // A fresh card per question: its answer and review start empty.
          key={keyOf(active)}
          projectId={projectId}
          question={active}
          correcting={corrected?.answered ?? false}
          onCancel={() => setCorrecting(null)}
          onSaved={() => setCorrecting(null)}
        />
      ) : (
        <EmptyState icon={IconCheck} title={t.done.title} body={t.done.body} />
      )}
      <AnsweredList
        questions={answered.filter((q) => keyOf(q) !== correcting)}
        onCorrect={(q) => setCorrecting(keyOf(q))}
      />
    </div>
  );
}
