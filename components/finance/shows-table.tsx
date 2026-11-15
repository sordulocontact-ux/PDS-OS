"use client";

import { IconCalendarDays } from "nucleo-sharp-essential";
import { useState } from "react";

import { IconBan } from "@/components/icons";
import { ShowForm } from "@/components/finance/show-draw-forms";
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
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { Show, ShowFormat } from "@/lib/finance/engines";
import { cancelShow } from "@/lib/finance/funding-actions";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { fundings } from "@/lib/i18n/fr/fundings";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { dialogs, fundings };

/**
 * The planned shows (« Émissions et lives »), by date: format, cost,
 * provisional titles; once its budget is opened, its lines count instead
 * of the format's cost. The Finance moves a show (the forecast follows) or
 * cancels it.
 */
export function ShowsTable({
  shows,
  formats,
  canManage,
}: {
  shows: Show[];
  formats: ShowFormat[];
  canManage: boolean;
}) {
  const t = fr.fundings.shows;
  const c = t.columns;
  const formatOf = new Map(formats.map((f) => [f.id, f]));
  const [moving, setMoving] = useState<Show | null>(null);
  const [cancelling, setCancelling] = useState<Show | null>(null);
  const submit = useWriteSubmit(
    () => setCancelling(null),
    fr.fundings.done.showCancelled,
  );
  return (
    <>
      <DataTable framed>
        <DataTableHeader>
          <DataTableHead fill>{c.label}</DataTableHead>
          <DataTableHead>{c.day}</DataTableHead>
          <DataTableHead align="end" hideBelow="sm">
            {c.cost}
          </DataTableHead>
          <DataTableHead align="end" hideBelow="md">
            {c.titles}
          </DataTableHead>
          {canManage && <DataTableActionsHead label={c.actions} />}
        </DataTableHeader>
        <DataTableBody>
          {shows.map((show) => {
            const format = formatOf.get(show.formatId);
            return (
              <DataTableRow key={show.id}>
                <DataTableCell fill>
                  <DataTableMedia
                    title={<span className="truncate">{show.label}</span>}
                    subtitle={format?.name}
                  />
                </DataTableCell>
                <DataTableCell className="tabular-nums">
                  {formatDay(show.plannedOn, { weekday: false })}
                </DataTableCell>
                <DataTableCell
                  align="end"
                  hideBelow="sm"
                  className="tabular-nums"
                >
                  {show.costCenterId ? (
                    <StatusBadge tone="info">{t.budgetOpen}</StatusBadge>
                  ) : (
                    formatAmount(format?.costCents ?? 0, { ht: false })
                  )}
                </DataTableCell>
                <DataTableCell
                  align="end"
                  hideBelow="md"
                  className="tabular-nums"
                >
                  {format?.provisionalTitles ?? 0}
                </DataTableCell>
                {canManage && (
                  <DataTableActionsCell>
                    <RowActions
                      label={t.rowActions(show.label)}
                      reveal
                      actions={[
                        {
                          key: "move",
                          label: t.move,
                          icon: IconCalendarDays,
                          onSelect: () => setMoving(show),
                        },
                        {
                          key: "cancel",
                          label: t.cancel,
                          icon: IconBan,
                          onSelect: () => setCancelling(show),
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
      {moving && (
        <FormDialog
          open
          onOpenChange={(next) => !next && setMoving(null)}
          title={t.form.moveTitle}
          description={t.form.description}
          closeLabel={fr.dialogs.close}
        >
          <ShowForm
            show={moving}
            formats={formats}
            onDone={() => setMoving(null)}
          />
        </FormDialog>
      )}
      {cancelling && (
        <ConfirmDialog
          open
          onOpenChange={(next) => !next && setCancelling(null)}
          title={t.cancelTitle}
          description={t.cancelBody}
          cancelLabel={fr.dialogs.cancel}
          closeLabel={fr.dialogs.close}
          confirmLabel={t.cancel}
          pendingLabel={t.cancelling}
          pending={submit.pending}
          error={submit.error}
          onConfirm={() => submit.run(() => cancelShow(cancelling.id))}
        />
      )}
    </>
  );
}
