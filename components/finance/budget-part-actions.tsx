"use client";

import { IconPenWriting2, IconPlus, IconTrash } from "nucleo-sharp-essential";
import { useState } from "react";

import {
  AttachSpendsForm,
  PartForm,
  type PartCandidate,
} from "@/components/finance/budget-part-forms";
import { IconCopy } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogButton } from "@/components/ui/dialog-button";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { BudgetPart } from "@/lib/finance/budget-envelope";
import { deleteBudgetPart } from "@/lib/finance/budget-envelope-actions";
import type { EnvelopeKind } from "@/lib/finance/envelopes";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";

const fr = { dialogs, financeBudgets };

/** « Ajouter un sous-budget », beside the sub-budgets' title. */
export function AddPartButton({
  kind,
  targetId,
}: {
  kind: EnvelopeKind;
  targetId: string;
}) {
  const t = fr.financeBudgets;
  return (
    <DialogButton
      label={t.actions.addPart}
      icon={IconPlus}
      title={t.partForm.addTitle}
      description=""
    >
      {(close) => (
        <PartForm kind={kind} targetId={targetId} part={null} onDone={close} />
      )}
    </DialogButton>
  );
}

type Gesture = "edit" | "attach" | "remove";

/** The « ⋯ » of a sub-budget's row: change it, attach spends, remove it. */
export function PartMenu({
  kind,
  targetId,
  part,
  candidates,
}: {
  kind: EnvelopeKind;
  targetId: string;
  part: BudgetPart;
  candidates: PartCandidate[];
}) {
  const t = fr.financeBudgets;
  const [open, setOpen] = useState<Gesture | null>(null);
  const close = () => setOpen(null);
  const submit = useWriteSubmit(close, "");
  const actions: RowAction[] = [
    {
      key: "edit",
      label: t.parts.edit,
      icon: IconPenWriting2,
      onSelect: () => setOpen("edit"),
    },
    {
      key: "attach",
      label: t.parts.attach,
      icon: IconCopy,
      onSelect: () => setOpen("attach"),
    },
    {
      key: "remove",
      label: t.parts.remove,
      icon: IconTrash,
      onSelect: () => setOpen("remove"),
    },
  ];
  return (
    <>
      <RowActions
        label={t.parts.rowActions(part.name)}
        reveal
        actions={actions}
      />
      {(open === "edit" || open === "attach") && (
        <FormDialog
          open
          onOpenChange={(next) => !next && close()}
          title={
            open === "edit"
              ? t.partForm.editTitle
              : t.attachForm.title(part.name)
          }
          description=""
          closeLabel={fr.dialogs.close}
        >
          {open === "edit" ? (
            <PartForm
              kind={kind}
              targetId={targetId}
              part={part}
              onDone={close}
            />
          ) : (
            <AttachSpendsForm
              part={part}
              candidates={candidates}
              onDone={close}
            />
          )}
        </FormDialog>
      )}
      {open === "remove" && (
        <ConfirmDialog
          open
          onOpenChange={(next) => !next && close()}
          title={t.removePart.title}
          description={t.removePart.body}
          cancelLabel={fr.dialogs.cancel}
          closeLabel={fr.dialogs.close}
          confirmLabel={t.removePart.confirm}
          pendingLabel={t.removePart.pending}
          pending={submit.pending}
          error={submit.error}
          destructive
          onConfirm={() => submit.run(() => deleteBudgetPart(part.id))}
        />
      )}
    </>
  );
}
