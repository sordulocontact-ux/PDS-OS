"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { prepareTargetDrafts } from "@/lib/activations/press/draft-actions";
import { activationPress } from "@/lib/i18n/fr/activation-press";
import { activations } from "@/lib/i18n/fr/activations";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { dialogs, activations, activationPress };

const t = fr.activationPress.template;

/** « Préparer les brouillons par cible », asked first : drafts only. */
export function PrepareDraftsButton({
  projectId,
  activationId,
  count,
}: {
  projectId: string;
  activationId: string;
  count: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        {t.prepare}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setError(null);
          setOpen(next);
        }}
        title={t.prepareTitle}
        description={t.prepareBody(count)}
        cancelLabel={fr.dialogs.cancel}
        closeLabel={fr.dialogs.close}
        confirmLabel={t.prepare}
        pendingLabel={fr.activations.saving}
        pending={pending}
        error={error}
        onConfirm={() =>
          startTransition(async () => {
            const result = await prepareTargetDrafts({
              projectId,
              activationId,
            });
            if (!result.ok) return setError(result.error);
            toast.success(t.prepared(result.count));
            setOpen(false);
          })
        }
      />
    </>
  );
}
