// Which spend a proof proves (Finance, new style lot 6): proposed by code,
// as the bank reconciliation does (reconcile.ts: amount, day, party,
// reference), never by the AI, never attached without a person. Midday's
// lesson (docs/ANALYSE-MIDDAY.md § 4.2): a deterministic score, the amount
// first. Client-safe, pure code.

import { days, fold, sameParty } from "@/lib/finance/reconcile";
import { spendDay, spendTtc, type FinanceSpend } from "@/lib/finance/spends";
import type { FinanceProof } from "@/lib/finance/proofs";

export type ProofReason = "amount" | "party" | "date" | "reference";

export type ProofMatch = {
  spend: FinanceSpend;
  reasons: ProofReason[];
  score: number;
};

// Below it, nothing is proposed: the same amount alone is enough, the same
// party alone is not (two taxis the same month).
const THRESHOLD = 40;

/** The spends still waiting for a proof: not refused, none attached. */
export const spendsWithoutProof = (spends: FinanceSpend[]) =>
  spends.filter((s) => !s.hasProof && !s.refused);

/**
 * The likeliest spends a proof proves, best first (three at most): the
 * same amount TTC weighs most, then the reference (an invoice number in
 * the spend's label or note), the party (supplier or label), the day
 * (the spend's own, or its due day).
 */
export function proofMatches(
  proof: Pick<FinanceProof, "values" | "kind">,
  open: FinanceSpend[],
): ProofMatch[] {
  const v = proof.values;
  if (proof.kind === "other") return [];
  if (v.amountCents === null && !v.vendor && !v.reference) return [];
  const ref = fold(v.reference);
  return open
    .map((spend) => {
      const reasons: ProofReason[] = [];
      let score = 0;
      if (v.amountCents !== null && spendTtc(spend) === v.amountCents) {
        reasons.push("amount");
        score += 50;
      }
      if (
        ref.length >= 3 &&
        fold(`${spend.label} ${spend.note ?? ""}`).includes(ref)
      ) {
        reasons.push("reference");
        score += 40;
      }
      if (v.vendor && sameParty(v.vendor, spend.supplier ?? spend.label)) {
        reasons.push("party");
        score += 25;
      }
      if (v.issuedOn) {
        const gap = Math.min(
          days(v.issuedOn, spend.spentOn),
          days(v.issuedOn, spendDay(spend)),
        );
        if (gap <= 10) {
          reasons.push("date");
          score += gap <= 3 ? 15 : 10;
        }
      }
      return { spend, reasons, score };
    })
    .filter((m) => m.score >= THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
