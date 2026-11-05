"use client";

import Link from "next/link";
import { useState } from "react";

import { QuestionCard } from "@/components/legal/intake/question-card";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { legal } from "@/lib/i18n/fr/legal";
import type { SynthesisAction as Action } from "@/lib/legal/confirmation/synthesis";
import type { IntakeQuestion } from "@/lib/legal/intake/types";

const fr = { dialogs, legal };

/** « Répondre » / « Corriger »: the line's question opens in a modal on the
 * Confirmation, answered or corrected without leaving the dossier (Sacha,
 * 05/11/2026; « montrer les corrections possibles », Juridique 01). Saving
 * revalidates the page, so the dossier shows the new answer. A question
 * the page did not receive keeps the way to the Cadrage juridique. */
export function SynthesisAction({
  projectId,
  action,
  question,
  position,
  total,
}: {
  projectId: string;
  action: Action;
  question: IntakeQuestion | undefined;
  // 1-based place of the question among the Cadrage's.
  position: number;
  total: number;
}) {
  const t = fr.legal.confirmation;
  const [open, setOpen] = useState(false);
  const label = t.actions[action.kind];
  if (!question)
    return (
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href={action.href} />}
      >
        {label}
      </Button>
    );
  const close = () => setOpen(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.questionDialog.title[action.kind]}
        description={t.questionDialog.description[action.kind]}
        closeLabel={fr.dialogs.close}
      >
        <QuestionCard
          projectId={projectId}
          question={question}
          position={position}
          total={total}
          correcting={action.kind === "correct" && question.answered}
          onCancel={close}
          onSaved={close}
        />
      </FormDialog>
    </>
  );
}
