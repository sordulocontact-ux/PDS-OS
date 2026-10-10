"use client";

import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fr } from "@/lib/i18n/fr";
import { openStrategyRevision } from "@/lib/strategy/actions/documents";

/**
 * « Réviser la stratégie » on a validated strategy (owner): a significant
 * change opens a revision; the next Brief version follows V1, never
 * replaces it. Asked first: the strategy becomes editable again.
 */
export function RevisionButton({ projectId }: { projectId: string }) {
  const t = fr.strategyDocuments;
  const [open, setOpen] = useState(false);
  const { pending, run } = useFramingAction();
  return (
    <>
      <Button size="lg" variant="outline" onClick={() => setOpen(true)}>
        {t.revision.open}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t.revision.title}
        description={t.revision.body}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        confirmLabel={t.revision.confirm}
        pendingLabel={t.revision.confirm}
        pending={pending}
        onConfirm={() =>
          run(
            () => openStrategyRevision(projectId),
            () => setOpen(false),
          )
        }
      />
    </>
  );
}
