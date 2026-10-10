"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fr } from "@/lib/i18n/fr";
import { advanceDeliverable } from "@/lib/production/actions";

type Step = "approve" | "check" | "deliver" | "reopen";

/** One decision on a deliverable, confirmed with what it means: three
 * distinct decisions (ticket Production § 20), or « Rouvrir ». */
export function DeliveryStepButton({
  projectId,
  deliverableId,
  title,
  step,
  onVersion = false,
}: {
  projectId: string;
  deliverableId: string;
  title: string;
  step: Step;
  // The creative decision rests on a validated version: « Rouvrir » keeps it.
  onVersion?: boolean;
}) {
  const t = fr.production;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const label = t.steps[step];
  return (
    <>
      <Button
        size="sm"
        variant={step === "reopen" ? "ghost" : "default"}
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
        title={`${label} · ${title}`}
        description={
          onVersion && step === "reopen"
            ? t.stepHints.reopenOnVersion
            : t.stepHints[step]
        }
        cancelLabel={t.cancel}
        closeLabel={t.close}
        confirmLabel={label}
        pendingLabel={t.saving}
        pending={pending}
        error={error}
        onConfirm={() =>
          startTransition(async () => {
            const result = await advanceDeliverable({
              projectId,
              deliverableId,
              step,
            });
            if (result.ok) setOpen(false);
            else setError(result.error);
          })
        }
      />
    </>
  );
}
