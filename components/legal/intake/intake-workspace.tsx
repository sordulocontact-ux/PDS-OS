"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconCheck } from "nucleo-sharp-essential";
import { useRef, useState } from "react";

import { IntakeAnswers } from "@/components/legal/intake/intake-answers";
import {
  LEGAL_ANSWER_FIELD,
  QuestionCard,
} from "@/components/legal/intake/question-card";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { legal } from "@/lib/i18n/fr/legal";
import { answerKey } from "@/lib/legal/intake/questions";
import type {
  IntakeQuestion,
  NotAskedQuestion,
} from "@/lib/legal/intake/types";

const fr = { legal };

const keyOf = (q: IntakeQuestion) => answerKey(q.key, q.masterId);

/**
 * The Cadrage juridique's conversation: PO's box on the first open question
 * (in the order the code decided), or on the one opened from a row of the
 * answers or with its arrows — an answered one comes back with its answer to
 * edit (the new answer supersedes, the history stays). Then every question
 * at a glance and the ones PO does not ask. One place to answer: a row opens
 * its question in the box, never a field of its own (an answer goes through
 * PO's reading, Sacha 06/11/2026).
 * The server sends the questions again after each save, so the next open one
 * comes by itself; once none is left, the Confirmation opens (Sacha,
 * 05/11/2026).
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
  const [opened, setOpened] = useState<string | null>(
    initialQuestion && questions.some((q) => keyOf(q) === initialQuestion)
      ? initialQuestion
      : null,
  );
  const active =
    (opened ? questions.find((q) => keyOf(q) === opened) : undefined) ??
    questions.find((q) => !q.answered);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const confirmationHref = routes.projectLegalStep(projectId, "confirmation");
  // Saved: the last open question answered (or an edit while none is
  // open) → the dossier to confirm; else the next open question.
  const saved = (q: IntakeQuestion) => {
    setOpened(null);
    if (questions.every((other) => other.answered || other === q))
      router.push(confirmationHref);
  };
  const index = active ? questions.indexOf(active) : -1;
  const go = (i: number) => {
    const q = questions[i];
    return q ? () => setOpened(keyOf(q)) : null;
  };
  // From a row, below the box: back up to it, the field ready to type.
  const openFromRow = (q: IntakeQuestion) => {
    setOpened(keyOf(q));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    box.current?.scrollIntoView({
      block: "start",
      behavior: reduce.matches ? "auto" : "smooth",
    });
    requestAnimationFrame(() =>
      document
        .getElementById(LEGAL_ANSWER_FIELD)
        ?.focus({ preventScroll: true }),
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div ref={box} className="scroll-mt-6">
        {active ? (
          <QuestionCard
            // A fresh card per question: its answer and review start anew.
            key={keyOf(active)}
            projectId={projectId}
            question={active}
            position={index + 1}
            total={questions.length}
            nav={
              questions.length > 1
                ? {
                    position: index + 1,
                    total: questions.length,
                    previous: go(index - 1),
                    next: go(index + 1),
                  }
                : undefined
            }
            correcting={active.answered}
            onSaved={() => saved(active)}
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
                render={<Link href={confirmationHref} />}
              >
                {t.done.action}
              </Button>
            }
          />
        )}
      </div>
      <IntakeAnswers
        questions={questions}
        notAsked={notAsked}
        activeKey={active ? keyOf(active) : null}
        keyOf={keyOf}
        onOpen={openFromRow}
      />
    </div>
  );
}
