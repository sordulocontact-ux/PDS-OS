"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { askBriefQuestions } from "@/lib/master-workflow/question-actions";

/**
 * "Poser les questions": the owner sends what the brief lacks to the people
 * the section lists (recomputed by the server, a task each in their Travail).
 */
export function AskQuestionsButton({ projectId }: { projectId: string }) {
  const t = fr.masterWorkflow.questions;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await askBriefQuestions(projectId);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(t.asked);
          router.refresh();
        })
      }
    >
      {pending ? t.asking : t.ask}
    </Button>
  );
}
