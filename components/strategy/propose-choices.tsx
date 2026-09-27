"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { proposeStrategyChoices } from "@/lib/strategy/actions/choices";

// "Proposer des réponses": PO pre-checks the three questions from the
// validated Brief and the call reports. Only for the owner, while editable;
// the outcome is a toast, the proposals show under each question.
export function ProposeChoices({ projectId }: { projectId: string }) {
  const t = fr.strategy.choices;
  const canEdit = useCanEditProject();
  const [pending, startTransition] = useTransition();

  if (!canEdit) return null;

  function propose() {
    startTransition(async () => {
      const result = await proposeStrategyChoices(projectId);
      if (result.ok) toast(t.proposedCount(result.count));
      else if (result.error === "no_sources") toast(t.noSources);
      else if (result.error === "stage_locked")
        toast.error(fr.framing.errors.stage_locked);
      else toast.error(t.failed);
    });
  }

  return (
    <Button
      variant="ghost"
      size="lg"
      onClick={propose}
      disabled={pending}
      aria-busy={pending || undefined}
      title={t.proposeHint}
    >
      {pending ? t.proposing : t.propose}
    </Button>
  );
}
