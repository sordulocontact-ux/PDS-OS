"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { prepareStrategyDraft } from "@/lib/strategy/actions/draft";
import type { DraftField } from "@/lib/strategy/draft-plan";

/**
 * « Proposer à nouveau » of one Strategy part not confirmed yet (MKT-S1-06):
 * PO drafts that field alone again from the sources; the others stay as
 * they are. Shown by the caller only to the owner.
 */
export function RedraftButton({
  projectId,
  field,
}: {
  projectId: string;
  field: DraftField;
}) {
  const t = fr.strategyDraft.draft;
  const [pending, startTransition] = useTransition();

  function redraft() {
    startTransition(async () => {
      const result = await prepareStrategyDraft(projectId, field);
      if (result.ok) {
        if (result.created === 0) toast(t.redraftNone);
      } else if (result.error === "no_sources") toast(t.noSources);
      else if (result.error === "stage_locked")
        toast.error(fr.framing.errors.stage_locked);
      else toast.error(t.failed);
    });
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={redraft}
      disabled={pending}
      aria-busy={pending || undefined}
    >
      {pending ? t.redrafting : t.redraft}
    </Button>
  );
}
