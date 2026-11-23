import { SheetHead } from "@/components/ui/side-sheet";
import { ReasonChips } from "@/components/finance/reason-chips";
import { TransactionProposal } from "@/components/finance/transaction-proposal";
import { Button } from "@/components/ui/button";
import type { RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  suggestionsFor,
  txState,
  type BankTransaction,
  type Candidate,
} from "@/lib/finance/reconcile";
import { financeSheet } from "@/lib/i18n/fr/finance-home";
import { reconcile } from "@/lib/i18n/fr/reconcile";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const t = financeSheet.tx;
const amount = (cents: number) => formatAmount(cents, { ht: false });

/** The bank's own wording leads; the name PDS OS knows it by comes under. */
export const txTitle = (tx: BankTransaction) =>
  tx.label ?? tx.counterparty ?? tx.reference ?? "";

/** What goes under the title: the name, when it adds to the title. */
export const txSubtitle = (tx: BankTransaction) =>
  [tx.counterparty !== tx.label ? tx.counterparty : null, tx.reference]
    .filter(Boolean)
    .join(" · ");

/**
 * A bank transaction in Finance's side sheet, as the proto (Sacha
 * 15/11/2026): the bank and the day, its amount large (money in green), what
 * it says; then one box with what PDS OS proposes it settles (« Encaissement
 * de » / « Paiement de », whose, what is left), why in ticked chips,
 * « Valider le rapprochement » and « Choisir autre chose »; or what it
 * settles already. The other gestures of its row under it, then its history.
 */
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
  const best =
    state === "open" || state === "partial"
      ? suggestionsFor(tx, candidates)[0]
      : undefined;
  const choose = actions.find((a) => a.key === "match");
  const others = actions.filter((a) => a.key !== "match");
  const said = txSubtitle(tx);

  return (
    <>
      <SheetHead
        eyebrow={t.eyebrow(formatDay(tx.bookedOn))}
        amount={`${tx.cents > 0 ? "+" : "−"}${amount(Math.abs(tx.cents))}`}
        positive={tx.cents > 0}
        caption={
          <>
            {said && <span>{said}</span>}
            {state === "partial" && (
              <StatusBadge tone="info">{reconcile.states.partial}</StatusBadge>
            )}
            {double && (
              <StatusBadge tone="warning">
                {reconcile.states.double}
              </StatusBadge>
            )}
            {state === "ignored" && (
              <StatusBadge tone="neutral">{t.ignored}</StatusBadge>
            )}
          </>
        }
      />

      {best ? (
        <section className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[color:var(--selection)] p-4">
          <p className="text-caption text-[color:var(--text-secondary)]">
            {best.candidate.kind === "income" ? t.incomeOf : t.spendOf}
          </p>
          <div className="flex flex-col gap-0.5">
            <p>{best.candidate.label}</p>
            <p className="text-caption text-[color:var(--text-secondary)]">
              {[
                best.candidate.party,
                reconcile.left(amount(best.candidate.leftCents)),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <ReasonChips
            reasons={best.reasons.map((r) => reconcile.reasons[r])}
          />
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onAccept(best.candidate)}>
                {t.acceptMatch}
              </Button>
              {choose && (
                <Button variant="outline" onClick={choose.onSelect}>
                  {t.chooseOther}
                </Button>
              )}
            </div>
          )}
        </section>
      ) : (
        state !== "ignored" && (
          <section className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[color:var(--border-hairline)] p-4">
            <p className="text-caption text-[color:var(--text-secondary)]">
              {tx.matches.length ? t.matched : t.proposal}
            </p>
            <TransactionProposal
              tx={tx}
              candidates={candidates}
              canManage={canManage}
              full
              withAccept={false}
              onAccept={onAccept}
            />
            {canManage && choose && !tx.matches.length && (
              <div>
                <Button variant="outline" onClick={choose.onSelect}>
                  {t.chooseOther}
                </Button>
              </div>
            )}
          </section>
        )
      )}
      {tx.ignoreReason && (
        <p className="text-body-sm text-[color:var(--text-secondary)]">
          {t.ignored} · {tx.ignoreReason}
        </p>
      )}

      {others.length > 0 && (
        <div
          role="group"
          aria-label={financeSheet.actions}
          className="flex flex-wrap gap-2"
        >
          {others.map((a) => {
            const Icon = a.icon;
            return (
              <Button key={a.key} variant="outline" onClick={a.onSelect}>
                <Icon aria-hidden data-icon="inline-start" />
                {a.label}
              </Button>
            );
          })}
        </div>
      )}
    </>
  );
}
