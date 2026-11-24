"use client";

import { IconPenWriting2, IconTrash } from "nucleo-sharp-essential";
import { useState } from "react";

import {
  AttachSpendsForm,
  PartForm,
  type PartCandidate,
} from "@/components/finance/budget-part-forms";
import { ConsumptionMeter } from "@/components/finance/consumption-meter";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DataTableActionsCell,
  DataTableCell,
  DataTableLink,
  DataTableRow,
} from "@/components/ui/data-table";
import { FormDialog } from "@/components/ui/form-dialog";
import { RestAmount } from "@/components/ui/rest-amount";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { PartRow as Part } from "@/lib/finance/budget-envelope";
import { deleteBudgetPart } from "@/lib/finance/budget-envelope-actions";
import type { EnvelopeKind } from "@/lib/finance/envelopes";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { formatAmount } from "@/lib/utils/money";

const fr = { dialogs, financeBudgets };

const amount = (cents: number) => formatAmount(cents, { ht: false });

type Gesture = "edit" | "attach" | "remove";

/**
 * One sub-budget's row: its amount, what is planned, spent and left. For the
 * Finance the row opens « Ranger des dépenses » (UX test of 23/11/2026: rows
 * that did nothing, the gesture hidden in « ⋯ »), the button says it, and
 * « ⋯ » keeps changing and removing it.
 */
export function PartRow({
  kind,
  targetId,
  part,
  candidates,
  canManage,
}: {
  kind: EnvelopeKind;
  targetId: string;
  part: Part;
  candidates: PartCandidate[];
  canManage: boolean;
}) {
  const t = fr.financeBudgets;
  const [open, setOpen] = useState<Gesture | null>(null);
  const close = () => setOpen(null);
  const submit = useWriteSubmit(close, "");
  const share = part.amountCents ? part.spentCents / part.amountCents : 0;
  const actions: RowAction[] = [
    {
      key: "edit",
      label: t.parts.edit,
      icon: IconPenWriting2,
      onSelect: () => setOpen("edit"),
    },
    {
      key: "remove",
      label: t.parts.remove,
      icon: IconTrash,
      onSelect: () => setOpen("remove"),
    },
  ];
  return (
    <DataTableRow>
      <DataTableCell fill>
        {canManage ? (
          <DataTableLink href={null} onOpen={() => setOpen("attach")}>
            <span className="font-medium">{part.name}</span>
          </DataTableLink>
        ) : (
          <span className="truncate font-medium">{part.name}</span>
        )}
      </DataTableCell>
      <DataTableCell align="end" hideBelow="sm" className="tabular-nums">
        {amount(part.amountCents)}
      </DataTableCell>
      <DataTableCell align="end" hideBelow="lg" className="tabular-nums">
        {amount(part.plannedCents)}
      </DataTableCell>
      <DataTableCell align="end" hideBelow="md" className="tabular-nums">
        {amount(part.spentCents)}
      </DataTableCell>
      <DataTableCell align="end">
        <RestAmount cents={part.restCents} bare />
      </DataTableCell>
      <DataTableCell hideBelow="md">
        <ConsumptionMeter
          share={share}
          label={t.figures.used(part.name, Math.round(share * 100))}
        />
      </DataTableCell>
      {canManage && (
        <DataTableActionsCell className="w-auto pl-3">
          <span className="flex items-center justify-end gap-1">
            <Button
              variant="outline"
              size="xs"
              className="relative z-10 max-sm:hidden"
              onClick={() => setOpen("attach")}
            >
              {t.parts.attach}
            </Button>
            <RowActions
              label={t.parts.rowActions(part.name)}
              reveal
              actions={actions}
            />
          </span>
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
        </DataTableActionsCell>
      )}
    </DataTableRow>
  );
}
