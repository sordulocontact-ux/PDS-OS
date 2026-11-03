"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { removeConceptionDeliverable } from "@/lib/design/actions/deliverables";
import { conception } from "@/lib/i18n/fr/conception";

const fr = { conception };

/** « Retirer » a need still to qualify, confirmed first. */
export function RemoveDeliverableButton({
  projectId,
  deliverableId,
}: {
  projectId: string;
  deliverableId: string;
}) {
  const t = fr.conception.deliverables;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await removeConceptionDeliverable(
        projectId,
        deliverableId,
      );
      if (!result.ok) return setError(result.error);
      setOpen(false);
      toast.success(t.removed);
    });

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {t.remove}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t.removeTitle}
        description={t.removeBody}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        confirmLabel={t.removeConfirm}
        pendingLabel={t.removing}
        pending={pending}
        destructive
        error={error}
        onConfirm={confirm}
      />
    </>
  );
}
