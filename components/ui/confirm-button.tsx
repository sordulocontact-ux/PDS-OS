"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { dialogs };

const t = fr.dialogs;

/**
 * A button whose action is asked first (« Transmettre », « Rapprocher »,
 * « Marquer prête pour tournage »): the dialog stays open while it runs and
 * keeps the refusal next to the buttons.
 */
export function ConfirmButton({
  label,
  variant = "outline",
  size = "sm",
  title,
  body,
  confirmLabel,
  pendingLabel,
  cancelLabel = t.cancel,
  done,
  run,
}: {
  label: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "lg" | "xs";
  title: string;
  body: string;
  confirmLabel: string;
  pendingLabel: string;
  // Replaces « Annuler » when the action itself cancels something.
  cancelLabel?: string;
  done: string;
  run: () => Promise<WriteResult>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className="relative z-10"
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setError(null);
          setOpen(next);
        }}
        title={title}
        description={body}
        cancelLabel={cancelLabel}
        closeLabel={t.close}
        confirmLabel={confirmLabel}
        pendingLabel={pendingLabel}
        pending={pending}
        error={error}
        onConfirm={() =>
          startTransition(async () => {
            const result = await run();
            if (!result.ok) return setError(result.error);
            toast.success(done);
            setOpen(false);
          })
        }
      />
    </>
  );
}
