"use client";

import {
  IconArrowDottedRotateAnticlockwise,
  IconBell,
  IconFile,
  IconPaperPlane2,
  IconPenWriting2,
  IconPlus,
} from "nucleo-sharp-essential";
import { useState } from "react";

import { IconBan, IconCircleCheck } from "@/components/icons";
import {
  IncomeDialog,
  type IncomeDialogKind,
} from "@/components/finance/income-dialog";
import { IncomeForm } from "@/components/finance/income-form";
import { Button } from "@/components/ui/button";
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
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { markInvoiceSent } from "@/lib/finance/invoice-actions";
import {
  awaitedOn,
  creditedCents,
  daysLate,
  incomeState,
  lastReminder,
  receivedCents,
  type Income,
} from "@/lib/finance/money-in";
import type { FinanceTarget } from "@/lib/finance/treasury-queries";
import { clientInvoices } from "@/lib/i18n/fr/client-invoices";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { treasury } from "@/lib/i18n/fr/treasury";
import { incomeStateTone } from "@/lib/ui/state-tones";
import { formatDay, formatShortDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { clientInvoices, dialogs, treasury };

const amount = (cents: number) => formatAmount(cents, { ht: false });
const short = (day: string) => formatShortDay(day, { bare: true });

/** « Nouvelle recette »: a new income, in the common modal. */
export function IncomeAddButton({
  targets,
  organizationId,
  ownerId,
  outline = false,
}: {
  targets: FinanceTarget[];
  organizationId: string;
  ownerId: string | null;
  // Among other actions of the same weight (Finance's overview).
  outline?: boolean;
}) {
  const t = fr.treasury;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="lg"
        variant={outline ? "outline" : "default"}
        onClick={() => setOpen(true)}
      >
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.incomes.add}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.incomeForm.newTitle}
        description={t.incomeForm.description}
        closeLabel={fr.dialogs.close}
        size="medium"
      >
        <IncomeForm
          income={null}
          targets={targets}
          organizationId={organizationId}
          ownerId={ownerId}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}

/**
 * The money coming in, one row per income: what and from whom, its project
 * or artist, the day it is awaited, its state, what it received of its
 * amount. `followUp` (the late ones, « Relances » of Ibé's ticket): how
 * late, who follows it, the last reminder and the next action instead of
 * the target and the state. The Finance acts from « ⋯ ».
 */
export function IncomesTable({
  incomes,
  targets,
  today,
  canManage,
  organizationId,
  ownerId,
  followUp = false,
}: {
  incomes: Income[];
  targets: FinanceTarget[];
  today: string;
  canManage: boolean;
  organizationId: string;
  ownerId: string | null;
  followUp?: boolean;
}) {
  const t = fr.treasury;
  const c = t.incomes.columns;
  const u = fr.clientInvoices.followUp;
  const [open, setOpen] = useState<{
    kind: IncomeDialogKind;
    income: Income;
  } | null>(null);
  const name = new Map(targets.map((x) => [x.id, x.name]));

  function actionsOf(income: Income): RowAction[] {
    if (income.cancelledAt) return [];
    const state = incomeState(income, today);
    const a = fr.clientInvoices.actions;
    const settled = receivedCents(income) + creditedCents(income);
    const awaiting = state !== "received" && state !== "credited";
    const on = (kind: IncomeDialogKind) => () => setOpen({ kind, income });
    return [
      ...(awaiting
        ? [
            {
              key: "receive",
              label: t.incomes.receive,
              icon: IconCircleCheck,
              onSelect: on("receive"),
            },
          ]
        : []),
      ...(awaiting && !income.invoiceNumber
        ? [
            {
              key: "invoice",
              label: a.addInvoice,
              icon: IconFile,
              onSelect: on("invoice"),
            },
          ]
        : []),
      ...(state === "draft"
        ? [
            {
              key: "sent",
              label: a.markSent,
              icon: IconPaperPlane2,
              onSelect: async () => {
                const result = await markInvoiceSent(income.id);
                if (result.ok) toast.success(result.done);
                else toast.error(result.error);
              },
            },
          ]
        : []),
      ...(awaiting
        ? [
            {
              key: "remind",
              label: a.remind,
              icon: IconBell,
              onSelect: on("remind"),
            },
          ]
        : []),
      ...(awaiting && income.invoiceNumber
        ? [
            {
              key: "credit",
              label: a.credit,
              icon: IconArrowDottedRotateAnticlockwise,
              onSelect: on("credit"),
            },
          ]
        : []),
      ...(income.file?.url
        ? [
            {
              key: "file",
              label: a.openFile,
              icon: IconFile,
              onSelect: () =>
                window.open(income.file?.url ?? "", "_blank", "noopener"),
            },
          ]
        : []),
      {
        key: "edit",
        label: t.incomes.edit,
        icon: IconPenWriting2,
        onSelect: on("edit"),
      },
      ...(settled === 0
        ? [
            {
              key: "cancel",
              label: t.incomes.cancel,
              icon: IconBan,
              onSelect: on("cancel"),
            },
          ]
        : []),
    ];
  }

  return (
    <>
      <DataTable framed>
        <DataTableHeader>
          <DataTableHead fill>{c.label}</DataTableHead>
          {followUp ? (
            <>
              <DataTableHead hideBelow="sm">{u.columns.late}</DataTableHead>
              <DataTableHead hideBelow="lg">{u.columns.owner}</DataTableHead>
              <DataTableHead hideBelow="md">{u.columns.last}</DataTableHead>
              <DataTableHead hideBelow="lg">{u.columns.next}</DataTableHead>
            </>
          ) : (
            <>
              <DataTableHead hideBelow="lg">{c.target}</DataTableHead>
              <DataTableHead hideBelow="sm">{c.due}</DataTableHead>
              <DataTableHead hideBelow="md">{c.state}</DataTableHead>
            </>
          )}
          <DataTableHead align="end">{c.amount}</DataTableHead>
          {canManage && <DataTableActionsHead label={c.actions} />}
        </DataTableHeader>
        <DataTableBody>
          {incomes.map((income) => {
            const state = incomeState(income, today);
            const received = receivedCents(income);
            const target =
              [income.projectId, income.artistId, income.dealId]
                .flatMap((id) => (id && name.get(id) ? [name.get(id)] : []))
                .join(" · ") || EMPTY_CELL;
            const last = lastReminder(income);
            return (
              <DataTableRow key={income.id}>
                <DataTableCell fill>
                  <DataTableMedia
                    title={<span className="truncate">{income.label}</span>}
                    subtitle={[
                      t.kinds[income.kind],
                      income.payer,
                      income.invoiceNumber &&
                        t.incomes.invoice(income.invoiceNumber),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                </DataTableCell>
                {followUp ? (
                  <>
                    <DataTableCell hideBelow="sm" className="tabular-nums">
                      <span className="text-[color:var(--error)]">
                        {u.days(daysLate(income, today))}
                      </span>
                    </DataTableCell>
                    <DataTableCell
                      hideBelow="lg"
                      className="text-[color:var(--text-secondary)]"
                    >
                      <span className="truncate">
                        {(income.ownerId && name.get(income.ownerId)) ||
                          EMPTY_CELL}
                      </span>
                    </DataTableCell>
                    <DataTableCell hideBelow="md">
                      <span className="truncate">
                        {last
                          ? u.lastOn(
                              short(last.remindedOn),
                              fr.clientInvoices.channels[last.channel],
                            )
                          : u.never}
                      </span>
                    </DataTableCell>
                    <DataTableCell hideBelow="lg">
                      <span className="truncate">
                        {income.nextAction
                          ? u.nextOn(
                              income.nextAction,
                              income.nextActionOn
                                ? short(income.nextActionOn)
                                : null,
                            )
                          : EMPTY_CELL}
                      </span>
                    </DataTableCell>
                  </>
                ) : (
                  <>
                    <DataTableCell
                      hideBelow="lg"
                      className="text-[color:var(--text-secondary)]"
                    >
                      <span className="truncate">{target}</span>
                    </DataTableCell>
                    <DataTableCell hideBelow="sm" className="tabular-nums">
                      {formatDay(awaitedOn(income), { weekday: false })}
                    </DataTableCell>
                    <DataTableCell hideBelow="md">
                      <StatusBadge tone={incomeStateTone[state]}>
                        {t.states[state]}
                      </StatusBadge>
                    </DataTableCell>
                  </>
                )}
                <DataTableCell align="end" className="tabular-nums">
                  {received > 0 && state !== "received"
                    ? t.incomes.partOf(amount(received), amount(income.cents))
                    : amount(income.cents)}
                </DataTableCell>
                {canManage && (
                  <DataTableActionsCell>
                    <RowActions
                      label={t.incomes.rowActions(income.label)}
                      reveal
                      actions={actionsOf(income)}
                    />
                  </DataTableActionsCell>
                )}
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
      {open && (
        <IncomeDialog
          kind={open.kind}
          income={open.income}
          targets={targets}
          organizationId={organizationId}
          ownerId={ownerId}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
