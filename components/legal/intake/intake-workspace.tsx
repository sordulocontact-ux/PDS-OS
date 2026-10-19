"use client";

import Link from "next/link";
import { IconCheck } from "nucleo-sharp-essential";
import { useState } from "react";

import { IntakeAnswers } from "@/components/legal/intake/intake-answers";
import { QuestionCard } from "@/components/legal/intake/question-card";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { answerKey } from "@/lib/legal/intake/questions";
import type {
  IntakeQuestion,
  NotAskedQuestion,
} from "@/lib/legal/intake/types";

const keyOf = (q: IntakeQuestion) => answerKey(q.key, q.masterId);

/**
 * The Cadrage juridique's conversation: the first open question (in the
 * order the code decided), or the one opened from the answers (« Répondre »,
 * « Corriger »); then every question at a glance and the ones PO does not
 * ask.
 * The server sends the questions again after each save, so the next one
 * comes by itself.
 */
export function IntakeWorkspace({
  projectId,
  questions,
  notAsked,
  initialQuestion,
}: {
  projectId: string;
  questions: IntakeQuestion[];
  notAsked: NotAskedQuestion[];
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

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {active ? (
        <QuestionCard
          // A fresh card per question: its answer and review start empty.
          key={keyOf(active)}
          projectId={projectId}
          question={active}
          position={questions.indexOf(active) + 1}
          total={questions.length}
          correcting={corrected?.answered ?? false}
          onCancel={() => setCorrecting(null)}
          onSaved={() => setCorrecting(null)}
        />
      ) : (
        // Every question answered: the next step, never a dead end.
        <EmptyState
          icon={IconCheck}
          title={questions.length === 0 ? t.nothingToAsk.title : t.done.title}
          body={questions.length === 0 ? t.nothingToAsk.body : t.done.body}
          action={
            <Button
              nativeButton={false}
              render={
                <Link
                  href={routes.projectLegalStep(projectId, "confirmation")}
                />
              }
            >
              {t.done.action}
            </Button>
          }
        />
      )}
      <IntakeAnswers
        questions={questions}
        notAsked={notAsked}
        activeKey={active ? keyOf(active) : null}
        keyOf={keyOf}
        onOpen={(q) => setCorrecting(keyOf(q))}
      />
    </div>
  );
}
