"use client";

import Link from "next/link";
import { IconCheck } from "nucleo-sharp-essential";
import { useState } from "react";

import { AnsweredList } from "@/components/legal/intake/answered-list";
import { QuestionCard } from "@/components/legal/intake/question-card";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
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
  embedded = false,
}: {
  projectId: string;
  questions: IntakeQuestion[];
  // `?question=<key>:<title|project>` (from the Confirmation's « Corriger »
  // or « Répondre »): that question opens first.
  initialQuestion: string | null;
  // On the État des lieux, the dossier and its confirmation sit below: once
  // every question is answered, nothing more is said here.
  embedded?: boolean;
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
      {questions.length > 0 && (active || !embedded) && (
        <p className="text-sm text-muted-foreground tabular-nums">
          {t.progress(answered.length, questions.length)}
        </p>
      )}
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
      ) : embedded ? null : (
        // Every question answered: the next step, never a dead end.
        <EmptyState
          icon={IconCheck}
          title={questions.length === 0 ? t.nothingToAsk.title : t.done.title}
          body={questions.length === 0 ? t.nothingToAsk.body : t.done.body}
          action={
            <Button
              nativeButton={false}
              render={<Link href={routes.projectLegal(projectId)} />}
            >
              {t.done.action}
            </Button>
          }
        />
      )}
      <AnsweredList
        questions={answered.filter((q) => keyOf(q) !== correcting)}
        onCorrect={(q) => setCorrecting(keyOf(q))}
      />
    </div>
  );
}
