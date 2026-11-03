"use client";

import { useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { masterWorkflow } from "@/lib/i18n/fr/master-workflow";
import { applyBriefQuestion } from "@/lib/master-workflow/question-actions";

const fr = { masterWorkflow };

/** "Ajouter au Brief": the owner puts an answer into the brief, once. */
export function ApplyAnswerButton({
  projectId,
  questionId,
}: {
  projectId: string;
  questionId: string;
}) {
  const t = fr.masterWorkflow.questions;
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await applyBriefQuestion(projectId, questionId);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(t.appliedToast);
        })
      }
    >
      {pending ? t.applying : t.apply}
    </Button>
  );
}
