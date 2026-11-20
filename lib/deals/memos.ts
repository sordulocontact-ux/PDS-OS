// The deal memo and the contract of a deal (BIZ 7): types and the
// comparison, written by code (rule 6). Client-safe.

import type { TermFormat, TermState, TermValue } from "@/lib/deals/terms";

/** A term as a memo photographed it. */
export type MemoTerm = {
  key: string;
  format: TermFormat;
  value: TermValue;
  state: TermState;
};

export type DealMemo = {
  id: string;
  number: number;
  status: "draft" | "validated";
  terms: MemoTerm[];
  stage: string;
  createdBy: string | null;
  createdAt: string;
  validatedBy: string | null;
  validatedAt: string | null;
};

/** The deal's contract: its participation's, or its own (deals.contract_id). */
export type DealContract = {
  id: string;
  source: "participation" | "deal";
  title: string;
  type: string;
  status: string;
  signedOn: string | null;
  // What is entered on it (financial_needs), in cents.
  amountCents: number | null;
  // The reader may open it in Contrats.
  visible: boolean;
};

/** A person's verdict on a term against the contract now. */
export type MemoCheck = {
  key: string;
  verdict: "conform" | "different";
  note: string | null;
  by: string | null;
  at: string;
};

export type CompareRow = {
  term: MemoTerm;
  // What the code reads on the contract: only its amount, against an
  // advance, a fee or an amount (a minimum guarantee, a brand's fee).
  amount: { contractCents: number; same: boolean } | null;
  check: MemoCheck | null;
  // The contract contradicts the memo: the amount entered differs, or a
  // person said « Différent ».
  differs: boolean;
};

/** Each term of the validated memo against the contract: never a correction. */
export function compareMemo(
  memo: DealMemo,
  contract: DealContract,
  checks: MemoCheck[],
): CompareRow[] {
  const byKey = new Map(checks.map((c) => [c.key, c]));
  return memo.terms.map((term) => {
    const cents =
      (term.format === "money" || term.format === "amount") &&
      contract.amountCents !== null
        ? (term.value as TermValue<"money" | "amount">).cents
        : null;
    const amount =
      cents !== null && contract.amountCents !== null
        ? {
            contractCents: contract.amountCents,
            same: cents === contract.amountCents,
          }
        : null;
    const check = byKey.get(term.key) ?? null;
    return {
      term,
      amount,
      check,
      differs:
        (amount !== null && !amount.same) || check?.verdict === "different",
    };
  });
}

/** The terms changed since the memo (a value or a state), by key. */
export function changedSince(
  memo: DealMemo,
  current: { key: string; value: TermValue | null; state: TermState }[],
): boolean {
  const photo = new Map(
    memo.terms.map((t) => [t.key, JSON.stringify([t.value, t.state])]),
  );
  const now = current.filter((t) => t.state !== "to_define");
  return (
    now.length !== photo.size ||
    now.some((t) => photo.get(t.key) !== JSON.stringify([t.value, t.state]))
  );
}
