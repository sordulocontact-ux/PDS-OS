"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Asks before an action that removes something from view. Without
// `onConfirm` it only explains (the action is not possible) and closes.
// Stays open while pending; the caller closes it on success.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  closeLabel,
  confirmLabel,
  pendingLabel,
  pending = false,
  destructive = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelLabel: string;
  // Accessible name of the ✕ button.
  closeLabel: string;
  confirmLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  // Definitive action: full-ink button. Reversible ones stay default.
  destructive?: boolean;
  onConfirm?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={closeLabel}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant={onConfirm ? "ghost" : "default"}
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          {onConfirm && (
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              size="lg"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={onConfirm}
            >
              {pending ? pendingLabel : confirmLabel}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
