import { SheetFacts, SheetHead } from "@/components/finance/finance-sheet";
import { RecordHistory } from "@/components/finance/record-history";
import { TransactionProposal } from "@/components/finance/transaction-proposal";
import { Button } from "@/components/ui/button";
import type { RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  txState,
  type BankTransaction,
  type Candidate,
} from "@/lib/finance/reconcile";
import { financeSheet } from "@/lib/i18n/fr/finance-home";
import { reconcile } from "@/lib/i18n/fr/reconcile";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const t = financeSheet.tx;
const amount = (cents: number) => formatAmount(cents, { ht: false });

/** A bank transaction in Finance's side sheet (lot 3): its amount, what it
 * says, what PDS OS proposes it settles (« Valider » there), the gestures of
 * its row, then its history. */
export function TransactionSheet({
  tx,
  candidates,
  double,
  canManage,
  actions,
  onAccept,
}: {
  tx: BankTransaction;
  candidates: Candidate[];
  double: boolean;
  canManage: boolean;
  actions: RowAction[];
  onAccept: (candidate: Candidate) => void;
}) {
  const state = txState(tx);
  return (
    <>
      <SheetHead
        eyebrow={t.eyebrow(formatDay(tx.bookedOn))}
        amount={`${tx.cents > 0 ? "+" : "−"}${amount(Math.abs(tx.cents))}`}
        caption={
          <>
            {state === "partial" && (
              <StatusBadge tone="info" size="sm">
                {reconcile.states.partial}
              </StatusBadge>
            )}
            {double && (
              <StatusBadge tone="warning" size="sm">
                {reconcile.states.double}
              </StatusBadge>
            )}
            {state === "ignored" && (
              <StatusBadge tone="neutral" size="sm">
                {t.ignored}
              </StatusBadge>
            )}
          </>
        }
      />
      {state !== "ignored" && (
        <section
          className={cn(
            "flex flex-col gap-2 rounded-xl border p-4",
            tx.matches.length
              ? "border-[color:var(--border-hairline)]"
              : "border-[color:var(--selection)]",
          )}
        >
          <h3 className="text-caption text-[color:var(--text-tertiary)]">
            {tx.matches.length ? t.matched : t.proposal}
          </h3>
          <TransactionProposal
            tx={tx}
            candidates={candidates}
            canManage={canManage}
            full
            onAccept={onAccept}
          />
          <p className="text-caption text-[color:var(--text-tertiary)]">
            {t.never}
          </p>
        </section>
      )}
      <SheetFacts
        facts={[
          { label: t.day, value: formatDay(tx.bookedOn) },
          ...(tx.reference
            ? [{ label: t.reference, value: tx.reference }]
            : []),
          ...(tx.label ? [{ label: t.label, value: tx.label }] : []),
          { label: t.source, value: t.sources[tx.source] },
          ...(tx.ignoreReason
            ? [{ label: t.ignored, value: tx.ignoreReason }]
            : []),
        ]}
      />
      {actions.length > 0 && (
        <div
          role="group"
          aria-label={financeSheet.actions}
          className="flex flex-wrap gap-2"
        >
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Button
                key={a.key}
                variant="outline"
                size="sm"
                onClick={a.onSelect}
              >
                <Icon aria-hidden data-icon="inline-start" />
                {a.label}
              </Button>
            );
          })}
        </div>
      )}
      <RecordHistory rowId={tx.id} />
    </>
  );
}
