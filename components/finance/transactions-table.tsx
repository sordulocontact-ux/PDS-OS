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
import { Button } from "@/components/ui/button";
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
import { DialogButton } from "@/components/ui/dialog-button";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  suggestionsFor,
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
          {transactions.map((tx) => {
            const state = txState(tx);
            const best =
              state === "open" || state === "partial"
                ? suggestionsFor(tx, candidates)[0]
                : undefined;
            return (
              <DataTableRow key={tx.id}>
                <DataTableCell fill>
                  <DataTableMedia
                    title={
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">
                          {tx.counterparty ?? tx.label ?? tx.reference}
                        </span>
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
                </DataTableCell>
                <DataTableCell fill hideBelow="md">
                  {tx.matches.length > 0 ? (
                    <span className="grid min-w-0 gap-0.5 text-body-md">
                      {tx.matches.map((m) => (
                        <span key={m.id} className="truncate">
                          {t.matchedWith(m.label, amount(m.cents))}
                        </span>
                      ))}
                    </span>
                  ) : best ? (
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid min-w-0 gap-0.5">
                        <span className="truncate text-body-md">
                          {t.suggestion(
                            best.candidate.label,
                            amount(best.candidate.leftCents),
                          )}
                        </span>
                        <span className="truncate text-caption text-[color:var(--text-secondary)]">
                          {[
                            t.kinds[best.candidate.kind],
                            ...best.reasons.map((r) => t.reasons[r]),
                          ].join(" · ")}
                        </span>
                      </span>
                      {canManage && (
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="relative z-10 shrink-0"
                          onClick={() => accept(tx, best.candidate)}
                        >
                          {t.accept}
                        </Button>
                      )}
                    </span>
                  ) : (
                    <span className="text-[color:var(--text-secondary)]">
                      {state === "ignored" ? "" : t.noSuggestion}
                    </span>
                  )}
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
