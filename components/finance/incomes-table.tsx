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
import { DueDate } from "@/components/ui/due-date";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { SideSheet } from "@/components/ui/side-sheet";
import { TableSortProvider } from "@/components/ui/table-sort";
import { IncomeSheet } from "@/components/finance/income-sheet";
import { useSheetRow } from "@/components/ui/use-sheet-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { markInvoiceSent } from "@/lib/finance/invoice-actions";
import {
  awaitedOn,
  creditedCents,
  incomeState,
  isOpen,
  lastReminder,
  receivedCents,
  remainingCents,
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

/** « Ajouter une entrée »: a new income, in the common modal. */
export function IncomeAddButton({
  targets,
  organizationId,
  ownerId,
  outline = false,
  iconOnly = false,
}: {
  targets: FinanceTarget[];
  organizationId: string;
  ownerId: string | null;
  // Among other actions of the same weight (Finance's overview).
  outline?: boolean;
  // « + » alone, its label in a fast tooltip (a list's tools, as Dépenses).
  iconOnly?: boolean;
}) {
  const t = fr.treasury;
  const [open, setOpen] = useState(false);
  return (
    <>
      {iconOnly ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="icon"
                aria-label={t.incomes.add}
                onClick={() => setOpen(true)}
              />
            }
          >
            <IconPlus aria-hidden />
          </TooltipTrigger>
          <TooltipContent side="bottom">{t.incomes.add}</TooltipContent>
        </Tooltip>
      ) : (
        <Button
          size="lg"
          variant={outline ? "outline" : "default"}
          onClick={() => setOpen(true)}
        >
          <IconPlus aria-hidden data-icon="inline-start" />
          {t.incomes.add}
        </Button>
      )}
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
 * amount, as the proto's columns: the invoice (number first), the client with
 * its project or artist, the due day with the days to or past it, the state,
 * for a late one the last reminder and the next action (« Relances » of Ibé's
 * ticket, with who follows it), what is left TTC. The Finance acts from « ⋯ ».
 */
export function IncomesTable({
  incomes,
  targets,
  today,
  canManage,
  organizationId,
  ownerId,
}: {
  incomes: Income[];
  targets: FinanceTarget[];
  today: string;
  canManage: boolean;
  organizationId: string;
  ownerId: string | null;
}) {
  const t = fr.treasury;
  const c = t.incomes.columns;
  const [open, setOpen] = useState<{
    kind: IncomeDialogKind;
    income: Income;
  } | null>(null);
  const name = new Map(targets.map((x) => [x.id, x.name]));
  // The row open in the side sheet (lot 3, docs/FINANCE-V2.md).
  const [sheet, setSheet] = useSheetRow(incomes.map((row) => row.id));
  const targetOf = (income: Income) =>
    [income.projectId, income.artistId, income.dealId]
      .flatMap((id) => (id && name.get(id) ? [name.get(id)] : []))
      .join(" · ") || EMPTY_CELL;

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
              label: income.invoiceNumber
                ? t.incomes.cancel
                : t.incomes.cancelEntry,
              icon: IconBan,
              onSelect: on("cancel"),
            },
          ]
        : []),
    ];
  }

  return (
    // One sort for the table and its sheet: ↑ ↓ follow the rows as sorted.
    <TableSortProvider>
      <DataTable framed>
        <DataTableHeader>
          <DataTableHead fill>{c.invoice}</DataTableHead>
          <DataTableHead hideBelow="lg">{c.client}</DataTableHead>
          <DataTableHead hideBelow="sm">{c.due}</DataTableHead>
          <DataTableHead hideBelow="md">{c.status}</DataTableHead>
          <DataTableHead hideBelow="lg">{c.reminder}</DataTableHead>
          <DataTableHead align="end">
            {incomes.some(isOpen) ? c.left : c.total}
          </DataTableHead>
          {canManage && <DataTableActionsHead label={c.actions} />}
        </DataTableHeader>
        <DataTableBody>
          {incomes.map((income, index) => {
            const state = incomeState(income, today);
            const received = receivedCents(income);
            const open = isOpen(income);
            const last = lastReminder(income);
            const nextParts = [
              income.nextActionOn ? short(income.nextActionOn) : null,
              (income.ownerId && name.get(income.ownerId)) || null,
            ].filter((part): part is string => Boolean(part));
            return (
              <DataTableRow key={income.id}>
                <DataTableCell fill>
                  <DataTableMedia
                    title={
                      <DataTableLink href={null} onOpen={() => setSheet(index)}>
                        {income.invoiceNumber ?? income.label}
                      </DataTableLink>
                    }
                    subtitle={
                      income.invoiceNumber ? income.label : t.kinds[income.kind]
                    }
                  />
                </DataTableCell>
                <DataTableCell hideBelow="lg">
                  <DataTableMedia
                    title={
                      <span className="truncate">
                        {income.payer ?? EMPTY_CELL}
                      </span>
                    }
                    subtitle={targetOf(income)}
                  />
                </DataTableCell>
                <DataTableCell hideBelow="sm">
                  <DueDate
                    dueOn={awaitedOn(income)}
                    awaited={open && !income.cancelledAt}
                    today={today}
                    fallback={formatDay(awaitedOn(income), { weekday: false })}
                  />
                </DataTableCell>
                <DataTableCell hideBelow="md">
                  <StatusBadge tone={incomeStateTone[state]}>
                    {t.states[state]}
                  </StatusBadge>
                </DataTableCell>
                <DataTableCell hideBelow="lg">
                  {state === "late" ? (
                    <DataTableMedia
                      title={
                        last
                          ? t.incomes.chase.last(short(last.remindedOn))
                          : t.incomes.chase.never
                      }
                      subtitle={
                        income.nextAction
                          ? t.incomes.chase.next(income.nextAction, nextParts)
                          : undefined
                      }
                    />
                  ) : (
                    EMPTY_CELL
                  )}
                </DataTableCell>
                <DataTableCell align="end" className="tabular-nums">
                  <span className="grid justify-items-end">
                    <span>
                      {amount(open ? remainingCents(income) : income.cents)}
                    </span>
                    {open && received > 0 && (
                      <span className="text-caption text-[color:var(--text-secondary)]">
                        {t.incomes.partOf(
                          amount(received),
                          amount(income.cents),
                        )}
                      </span>
                    )}
                  </span>
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
      {sheet !== null && incomes[sheet] && (
        <SideSheet
          open
          onClose={() => setSheet(null)}
          title={incomes[sheet].label}
          index={sheet}
          total={incomes.length}
          onMove={setSheet}
        >
          <IncomeSheet
            income={incomes[sheet]}
            target={targetOf(incomes[sheet])}
            today={today}
            actions={canManage ? actionsOf(incomes[sheet]) : []}
          />
        </SideSheet>
      )}
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
    </TableSortProvider>
  );
}
