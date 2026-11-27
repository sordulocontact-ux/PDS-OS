"use client";

import { useState, useTransition } from "react";

import { IconRefresh } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/ui/row-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { production } from "@/lib/i18n/fr/production";
import { advanceDeliverable } from "@/lib/production/actions";

const fr = { production };

type Step = "approve" | "check" | "deliver" | "reopen";

type StepProps = {
  projectId: string;
  deliverableId: string;
  title: string;
  step: Step;
  // The creative decision rests on a validated version: « Rouvrir » keeps it.
  onVersion?: boolean;
};

/** One decision on a deliverable, confirmed with what it means: three
 * distinct decisions (ticket Production § 20), or « Rouvrir ». */
export function DeliveryStepButton(props: StepProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant={props.step === "reopen" ? "ghost" : "default"}
        onClick={() => setOpen(true)}
      >
        {fr.production.steps[props.step]}
      </Button>
      <DeliveryStepDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}

/** « Rouvrir » kept out of the row of text buttons (never three side by
 * side): an item of « ⋯ », with the same confirmation. */
export function ReopenDeliveryMenu(props: Omit<StepProps, "step">) {
  const t = fr.production;
  const [open, setOpen] = useState(false);
  return (
    <>
      <RowActions
        label={t.moreActions}
        size="icon-lg"
        actions={[
          {
            key: "reopen",
            label: t.steps.reopen,
            icon: IconRefresh,
            onSelect: () => setOpen(true),
          },
        ]}
      />
      <DeliveryStepDialog
        {...props}
        step="reopen"
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function DeliveryStepDialog({
  projectId,
  deliverableId,
  title,
  step,
  onVersion = false,
  open,
  onOpenChange: setOpen,
}: StepProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = fr.production;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const label = t.steps[step];
  return (
    <>
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
