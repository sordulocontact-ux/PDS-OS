"use client";

import { useState } from "react";

import { useDesignAction } from "@/components/design/work/use-design-action";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { confirmDesignIntentions } from "@/lib/design/actions/consolidation";
import { conceptionIntents } from "@/lib/i18n/fr/conception-intents";

const fr = { conceptionIntents };

/**
 * « Confirmer les intentions » of a target, for the owner. When it cannot
 * be done yet, the button stays focusable and says why (`blocked`).
 */
export function ConfirmIntentionsButton({
  projectId,
  target,
  blocked,
}: {
  projectId: string;
  // A deliverable id, or « direction ».
  target: string;
  blocked: string | null;
}) {
  const t = fr.conceptionIntents.consolidation;
  const [open, setOpen] = useState(false);
  const { pending, run } = useDesignAction();
  return (
    <div className="flex flex-col gap-1.5">
      <Button
        className="self-start"
        aria-disabled={Boolean(blocked) || undefined}
        aria-describedby={blocked ? `confirm-blocked-${target}` : undefined}
        onClick={() => !blocked && setOpen(true)}
      >
        {t.confirm}
      </Button>
      {blocked && (
        <p
          id={`confirm-blocked-${target}`}
          className="text-caption text-muted-foreground"
        >
          {blocked}
        </p>
      )}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t.confirmTitle}
        description={t.confirmBody}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        confirmLabel={t.confirm}
        pendingLabel={t.confirming}
        pending={pending}
        onConfirm={() =>
          run(() => confirmDesignIntentions(projectId, target), {
            success: t.confirmedToast,
            onSuccess: () => setOpen(false),
          })
        }
      />
    </div>
  );
}
