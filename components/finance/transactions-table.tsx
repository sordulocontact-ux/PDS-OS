"use client";

import {
  IconArrowDottedRotateAnticlockwise,
  IconLink,
} from "nucleo-sharp-essential";
import { useState } from "react";

import { IconBan } from "@/components/icons";
import {
  BankImportForm,
  IgnoreForm,
  ManualTransactionForm,
  MatchForm,
} from "@/components/finance/reconcile-forms";
import { FinanceSheet } from "@/components/finance/finance-sheet";
import { TransactionProposal } from "@/components/finance/transaction-proposal";
import { TransactionSheet } from "@/components/finance/transaction-sheet";
import { useSheetRow } from "@/components/finance/use-sheet-row";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
} from "@/components/ui/data-table";
import { DialogButton } from "@/components/ui/dialog-button";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  txLeft,
  txState,
  type BankTransaction,
  type Candidate,
  type TransactionMatch,
} from "@/lib/finance/reconcile";
import {
  matchTransaction,
  setTransactionIgnored,
  unmatch,
} from "@/lib/finance/reconcile-actions";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { reconcile } from "@/lib/i18n/fr/reconcile";
import { formatShortDay } from "@/lib/utils/day";
import { amountInput, formatAmount } from "@/lib/utils/money";

const fr = { dialogs, reconcile };

const amount = (cents: number) => formatAmount(cents, { ht: false });

/** « Importer un relevé », « Ajouter une transaction ». */
export function ReconcileButtons() {
  const t = fr.reconcile;
  return (
    <div className="flex flex-wrap gap-2">
      <DialogButton
        label={t.add}
        size="lg"
        title={t.manualForm.title}
        description={t.manualForm.description}
      >
        {(close) => <ManualTransactionForm onDone={close} />}
      </DialogButton>
      <DialogButton
        label={t.import}
        variant="default"
        size="lg"
        title={t.importForm.title}
        description={t.importForm.description}
      >
        {(close) => <BankImportForm onDone={close} />}
      </DialogButton>
    </div>
  );
}

type Open =
  | { kind: "match"; tx: BankTransaction; preset: Candidate | null }
  | { kind: "ignore"; tx: BankTransaction }
  | { kind: "undo"; match: TransactionMatch }
  | null;

/**
 * The bank's transactions, one row each: who and when, what PDS OS
 * proposes it settles (the same amount, a near day, the same party, the
 * invoice's reference) or what it settles already, its signed amount. « Valider »
 * accepts the proposal; nothing is ever matched without a person.
 */
export function TransactionsTable({
  transactions,
  candidates,
  doubles,
  canManage,
}: {
  transactions: BankTransaction[];
  candidates: Candidate[];
  doubles: string[];
  canManage: boolean;
}) {
  const t = fr.reconcile;
  const c = t.columns;
  const [open, setOpen] = useState<Open>(null);
  // The row open in the side sheet (lot 3, docs/FINANCE-V2.md).
  const [sheet, setSheet] = useSheetRow(transactions.map((row) => row.id));
  const close = () => setOpen(null);
  const undo = useWriteSubmit(close, t.done.unmatched);
  const double = new Set(doubles);

  async function accept(tx: BankTransaction, candidate: Candidate) {
    const result = await matchTransaction({
      transactionId: tx.id,
      kind: candidate.kind,
      targetId: candidate.id,
      amount: amountInput(Math.min(txLeft(tx), candidate.leftCents)),
    });
    if (result.ok) toast.success(result.done ?? t.done.matched);
    else toast.error(result.error);
  }

  function actionsOf(tx: BankTransaction): RowAction[] {
    const state = txState(tx);
    if (state === "ignored")
      return [
        {
          key: "restore",
          label: t.restore,
          icon: IconArrowDottedRotateAnticlockwise,
          onSelect: async () => {
            const result = await setTransactionIgnored({
              id: tx.id,
              reason: null,
            });
            if (result.ok) toast.success(result.done ?? t.done.restored);
            else toast.error(result.error);
          },
        },
      ];
    return [
      ...(state !== "matched"
        ? [
            {
              key: "match",
              label: t.choose,
              icon: IconLink,
              onSelect: () => setOpen({ kind: "match", tx, preset: null }),
            },
          ]
        : []),
      ...tx.matches.map((m) => ({
        key: `undo-${m.id}`,
        label: `${t.undo} · ${m.label}`,
        icon: IconArrowDottedRotateAnticlockwise,
        onSelect: () => setOpen({ kind: "undo", match: m }),
      })),
      ...(state === "open"
        ? [
            {
              key: "ignore",
              label: t.ignore,
              icon: IconBan,
              onSelect: () => setOpen({ kind: "ignore", tx }),
            },
          ]
        : []),
    ];
  }

  return (
    <>
      <DataTable framed>
        <DataTableHeader>
          <DataTableHead fill>{c.transaction}</DataTableHead>
          <DataTableHead fill hideBelow="md">
            {c.suggestion}
          </DataTableHead>
          <DataTableHead align="end">{c.amount}</DataTableHead>
          {canManage && <DataTableActionsHead label={c.actions} />}
        </DataTableHeader>
        <DataTableBody>
          {transactions.map((tx, index) => {
            const state = txState(tx);
            return (
              <DataTableRow key={tx.id}>
                <DataTableCell fill>
                  <DataTableMedia
                    title={
                      <span className="flex min-w-0 items-center gap-2">
                        <DataTableLink
                          href={null}
                          onOpen={() => setSheet(index)}
                        >
                          {tx.counterparty ?? tx.label ?? tx.reference}
                        </DataTableLink>
                        {state === "partial" && (
                          <StatusBadge tone="info">
                            {t.states.partial}
                          </StatusBadge>
                        )}
                        {double.has(tx.id) && (
                          <StatusBadge tone="warning">
                            {t.states.double}
                          </StatusBadge>
                        )}
                      </span>
                    }
                    subtitle={[
                      formatShortDay(tx.bookedOn, { bare: true }),
                      tx.reference,
                      tx.ignoreReason,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  {/* Narrow screen: the proposal under the transaction, whole. */}
                  {state !== "ignored" && (
                    <div className="mt-2 md:hidden">
                      <TransactionProposal
                        tx={tx}
                        candidates={candidates}
                        canManage={canManage}
                        full
                        onAccept={(candidate) => accept(tx, candidate)}
                      />
                    </div>
                  )}
                </DataTableCell>
                <DataTableCell fill hideBelow="md">
                  <TransactionProposal
                    tx={tx}
                    candidates={candidates}
                    canManage={canManage}
                    onAccept={(candidate) => accept(tx, candidate)}
                  />
                </DataTableCell>
                <DataTableCell
                  align="end"
                  className="whitespace-nowrap tabular-nums"
                >
                  <span
                    className={
                      tx.cents > 0 ? "text-[color:var(--tone-success-fg)]" : ""
                    }
                  >
                    {tx.cents > 0 ? "+" : "−"}
                    {amount(Math.abs(tx.cents))}
                  </span>
                </DataTableCell>
                {canManage && (
                  <DataTableActionsCell>
                    <RowActions
                      label={t.rowActions(tx.counterparty ?? tx.label ?? "")}
                      reveal
                      actions={actionsOf(tx)}
                    />
                  </DataTableActionsCell>
                )}
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
      {sheet !== null && transactions[sheet] && (
        <FinanceSheet
          open
          onClose={() => setSheet(null)}
          title={
            transactions[sheet].counterparty ?? transactions[sheet].label ?? ""
          }
          index={sheet}
          total={transactions.length}
          onMove={setSheet}
        >
          <TransactionSheet
            tx={transactions[sheet]}
            candidates={candidates}
            double={double.has(transactions[sheet].id)}
            canManage={canManage}
            actions={canManage ? actionsOf(transactions[sheet]) : []}
            onAccept={(candidate) => accept(transactions[sheet], candidate)}
          />
        </FinanceSheet>
      )}
      {open?.kind === "match" && (
        <FormDialog
          open
          onOpenChange={(next) => !next && close()}
          title={t.matchForm.title}
          description={t.matchForm.description(
            open.tx.counterparty ?? open.tx.label ?? "",
            amount(txLeft(open.tx)),
          )}
          closeLabel={fr.dialogs.close}
        >
          <MatchForm
            tx={open.tx}
            candidates={candidates}
            preset={open.preset}
            onDone={close}
          />
        </FormDialog>
      )}
      {open?.kind === "ignore" && (
        <FormDialog
          open
          onOpenChange={(next) => !next && close()}
          title={t.ignoreForm.title}
          description={t.ignoreForm.description}
          closeLabel={fr.dialogs.close}
        >
          <IgnoreForm tx={open.tx} onDone={close} />
        </FormDialog>
      )}
      {open?.kind === "undo" && (
        <ConfirmDialog
          open
          onOpenChange={(next) => !next && close()}
          title={t.undoTitle}
          description={t.undoBody}
          cancelLabel={fr.dialogs.cancel}
          closeLabel={fr.dialogs.close}
          confirmLabel={t.undo}
          pendingLabel={t.undoing}
          pending={undo.pending}
          error={undo.error}
          onConfirm={() =>
            undo.run(() =>
              unmatch({ kind: open.match.kind, id: open.match.id }),
            )
          }
        />
      )}
    </>
  );
}
