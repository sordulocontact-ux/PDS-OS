"use client";

import { IconBan } from "@/components/icons";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { RowActions } from "@/components/ui/row-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { installmentsOf, type CreditDraw } from "@/lib/finance/engines";
import { removeCreditDraw } from "@/lib/finance/funding-actions";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { fundings } from "@/lib/i18n/fr/fundings";
import { formatShortDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { dialogs, fundings };

const amount = (cents: number) => formatAmount(cents, { ht: false });

/**
 * The Pay Later draws: what was financed, in how many installments at what
 * fee, the next installment and what is left to pay back. A draw entered
 * by mistake is removed from « ⋯ » (its spend then leaves on its own day
 * again).
 */
export function DrawsTable({
  draws,
  today,
  canManage,
}: {
  draws: CreditDraw[];
  today: string;
  canManage: boolean;
}) {
  const t = fr.fundings.payLater;
  const c = t.columns;
  const [removing, setRemoving] = useState<CreditDraw | null>(null);
  const submit = useWriteSubmit(
    () => setRemoving(null),
    fr.fundings.done.drawRemoved,
  );
  return (
    <>
      <DataTable framed>
        <DataTableHeader>
          <DataTableHead icon="item" fill>
            {c.label}
          </DataTableHead>
          <DataTableHead icon="date" hideBelow="sm">
            {c.next}
          </DataTableHead>
          <DataTableHead icon="amount" align="end">
            {c.left}
          </DataTableHead>
          {canManage && <DataTableActionsHead label={c.actions} />}
        </DataTableHeader>
        <DataTableBody>
          {draws.map((d) => {
            const left = installmentsOf(d).filter((x) => x.day > today);
            const next = left[0];
            return (
              <DataTableRow key={d.id}>
                <DataTableCell fill>
                  <DataTableMedia
                    title={<span className="truncate">{d.label}</span>}
                    subtitle={t.drawLine(
                      amount(d.cents),
                      d.installments,
                      `${String(d.feeBp / 100).replace(".", ",")} %`,
                    )}
                  />
                </DataTableCell>
                <DataTableCell hideBelow="sm" className="tabular-nums">
                  {next
                    ? t.nextOn(
                        amount(next.cents),
                        formatShortDay(next.day, { bare: true }),
                      )
                    : t.done}
                </DataTableCell>
                <DataTableCell align="end" className="tabular-nums">
                  {amount(left.reduce((s, x) => s + x.cents, 0))}
                </DataTableCell>
                {canManage && (
                  <DataTableActionsCell>
                    <RowActions
                      label={fr.fundings.shows.rowActions(d.label)}
                      reveal
                      actions={[
                        {
                          key: "remove",
                          label: t.remove,
                          icon: IconBan,
                          onSelect: () => setRemoving(d),
                        },
                      ]}
                    />
                  </DataTableActionsCell>
                )}
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
      {removing && (
        <ConfirmDialog
          open
          onOpenChange={(next) => !next && setRemoving(null)}
          title={t.removeTitle}
          description={t.removeBody}
          cancelLabel={fr.dialogs.cancel}
          closeLabel={fr.dialogs.close}
          confirmLabel={t.remove}
          pendingLabel={t.removing}
          pending={submit.pending}
          error={submit.error}
          onConfirm={() => submit.run(() => removeCreditDraw(removing.id))}
        />
      )}
    </>
  );
}
