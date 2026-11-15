// « PDS OS propose un rapprochement selon le montant, la date, le tiers et
// la référence. La validation humaine reste obligatoire » (Ibé's ticket,
// lot 6): what a bank transaction could settle, scored by code, never
// matched without a person. Client-safe, pure code.

export type TransactionMatch = {
  // The receipt (money in) or the match (money out) to undo.
  id: string;
  kind: "income" | "spend";
  targetId: string;
  label: string;
  cents: number;
};

export type BankTransaction = {
  id: string;
  bookedOn: string;
  // Signed: money in > 0, money out < 0.
  cents: number;
  counterparty: string | null;
  reference: string | null;
  label: string | null;
  source: "csv" | "manual";
  ignoreReason: string | null;
  matches: TransactionMatch[];
};

/** What a transaction could settle: an open income (money in), a spend not
 * matched in full (money out). */
export type Candidate = {
  kind: "income" | "spend";
  id: string;
  label: string;
  leftCents: number;
  day: string;
  party: string | null;
  reference: string | null;
};

export type Reason = "amount" | "date" | "party" | "reference";

export type Suggestion = {
  candidate: Candidate;
  reasons: Reason[];
  score: number;
};

export const usedCents = (tx: BankTransaction) =>
  tx.matches.reduce((s, m) => s + m.cents, 0);

/** What is left of a transaction to match. */
export const txLeft = (tx: BankTransaction) =>
  Math.max(Math.abs(tx.cents) - usedCents(tx), 0);

export type TxState = "open" | "partial" | "matched" | "ignored";

export function txState(tx: BankTransaction): TxState {
  if (tx.ignoreReason) return "ignored";
  const used = usedCents(tx);
  if (used >= Math.abs(tx.cents)) return "matched";
  return used > 0 ? "partial" : "open";
}

export const fold = (value: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const days = (a: string, b: string) =>
  Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) /
  86400000;

// Words too common to say two names are the same party.
const COMMON = new Set([
  "sas",
  "sarl",
  "sa",
  "eurl",
  "the",
  "les",
  "de",
  "et",
  "and",
]);

/** Two names share a word that says who (not « SAS », « the »…). Also
 * used by the box of proofs (proof-match.ts). */
export function sameParty(a: string | null, b: string | null) {
  const words = (v: string | null) =>
    fold(v)
      .split(" ")
      .filter((w) => w.length > 2 && !COMMON.has(w));
  const theirs = new Set(words(b));
  return words(a).some((w) => theirs.has(w));
}

/**
 * The likeliest candidates of a transaction, best first (three at most):
 * the same amount weighs most, then the reference (an invoice number in
 * the transaction's reference or label), the party, the day.
 */
export function suggestionsFor(
  tx: BankTransaction,
  candidates: Candidate[],
): Suggestion[] {
  const left = txLeft(tx);
  if (left === 0 || tx.ignoreReason) return [];
  const kind = tx.cents > 0 ? "income" : "spend";
  const text = fold(`${tx.reference ?? ""} ${tx.label ?? ""}`);
  return candidates
    .filter((c) => c.kind === kind && c.leftCents > 0)
    .map((c) => {
      const reasons: Reason[] = [];
      let score = 0;
      if (c.leftCents === left) {
        reasons.push("amount");
        score += 50;
      }
      const ref = fold(c.reference);
      if (ref && text.includes(ref)) {
        reasons.push("reference");
        score += 40;
      }
      if (sameParty(tx.counterparty ?? tx.label, c.party ?? c.label)) {
        reasons.push("party");
        score += 25;
      }
      const gap = days(tx.bookedOn, c.day);
      if (gap <= 10) {
        reasons.push("date");
        score += gap <= 3 ? 15 : 10;
      }
      return { candidate: c, reasons, score };
    })
    .filter((s) => s.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

/** Transactions that look entered twice: same day, amount and party. */
export function possibleDuplicates(transactions: BankTransaction[]) {
  const seen = new Map<string, string>();
  const doubles = new Set<string>();
  for (const tx of transactions) {
    const key = `${tx.bookedOn}|${tx.cents}|${fold(tx.counterparty ?? tx.label)}`;
    const first = seen.get(key);
    if (first) {
      doubles.add(first);
      doubles.add(tx.id);
    } else seen.set(key, tx.id);
  }
  return doubles;
}
