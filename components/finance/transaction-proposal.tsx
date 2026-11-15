"use client";

import { Button } from "@/components/ui/button";
import {
  suggestionsFor,
  txState,
  type BankTransaction,
  type Candidate,
} from "@/lib/finance/reconcile";
import { reconcile } from "@/lib/i18n/fr/reconcile";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/utils/money";

const fr = { reconcile };

const amount = (cents: number) => formatAmount(cents, { ht: false });

/**
 * What a bank transaction settles already, or what PDS OS proposes it
 * settles (the same amount, a near day, the same party, the reference) with
 * « Valider ». `full`: under the transaction on a narrow screen, every word
 * shown (UX test of 15/11/2026: a truncated proposal was accepted blind);
 * else one line each, in its own column.
 */
export function TransactionProposal({
  tx,
  candidates,
  canManage,
  full = false,
  onAccept,
}: {
  tx: BankTransaction;
  candidates: Candidate[];
  canManage: boolean;
  full?: boolean;
  onAccept: (candidate: Candidate) => void;
}) {
  const t = fr.reconcile;
  const state = txState(tx);
  const line = full ? "whitespace-normal break-words" : "truncate";
  if (tx.matches.length > 0)
    return (
      <span className="grid min-w-0 gap-0.5 text-body-md">
        {tx.matches.map((m) => (
          <span key={m.id} className={line}>
            {t.matchedWith(m.label, amount(m.cents))}
          </span>
        ))}
      </span>
    );
  const best =
    state === "open" || state === "partial"
      ? suggestionsFor(tx, candidates)[0]
      : undefined;
  if (!best)
    return (
      <span className="text-[color:var(--text-secondary)]">
        {state === "ignored" ? "" : t.noSuggestion}
      </span>
    );
  return (
    <span
      className={cn(
        "flex min-w-0 gap-3",
        full ? "flex-col items-start gap-2" : "items-center",
      )}
    >
      <span className="grid min-w-0 gap-0.5">
        <span className={cn(line, "text-body-md")}>
          {t.suggestion(best.candidate.label, amount(best.candidate.leftCents))}
        </span>
        <span
          className={cn(
            line,
            "text-caption text-[color:var(--text-secondary)]",
          )}
        >
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
          onClick={() => onAccept(best.candidate)}
        >
          {t.accept}
        </Button>
      )}
    </span>
  );
}
