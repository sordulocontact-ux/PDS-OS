// The box of proofs (Finance, new style lot 6, docs/FINANCE-V2.md): a
// ticket or an invoice received, what was read in it and how sure the code
// is of each value, and the spend it proves once a person attached it.
// Client-safe, pure code: every state here is computed, never stored.

export const PROOF_VALUES = [
  "vendor",
  "amount",
  "vat",
  "issuedOn",
  "reference",
] as const;
export type ProofValue = (typeof PROOF_VALUES)[number];

export type ProofKind = "receipt" | "invoice" | "other";

export type ProofReading = {
  vendor: string | null;
  // TTC, in cents.
  amountCents: number | null;
  vatCents: number | null;
  issuedOn: string | null;
  reference: string | null;
};

export type FinanceProof = {
  id: string;
  // Its file in finance-files (a Finance spend's proof once created from it).
  path: string;
  fileName: string;
  mime: string;
  url: string | null;
  source: "upload" | "email";
  // Who dropped it or sent it, and from which address.
  from: string | null;
  emailFrom: string | null;
  receivedAt: string;
  readState: "pending" | "read" | "failed";
  kind: ProofKind | null;
  values: ProofReading;
  // Found as written in the PDF's text, value by value.
  verified: Record<ProofValue, boolean>;
  // What the reading gave, before a person changed anything.
  read: ProofReading | null;
  checkedBy: string | null;
  checkedAt: string | null;
  lineId: string | null;
  attachedBy: string | null;
  attachedAt: string | null;
  dismissedAt: string | null;
  dismissReason: string | null;
};

export const isPhoto = (proof: Pick<FinanceProof, "mime">) =>
  proof.mime.startsWith("image/");

/** Amount and day are what a match stands on: found in the text, or
 * checked by a person (the database asks the same, attach_finance_proof). */
export const proofTrusted = (
  proof: Pick<FinanceProof, "verified" | "checkedAt">,
) =>
  proof.checkedAt !== null ||
  (proof.verified.amount && proof.verified.issuedOn);

export type ProofState =
  | "reading"
  | "toCheck"
  | "proposed"
  | "waiting"
  | "other"
  | "attached"
  | "dismissed";

/** Its state, from its columns and whether the code found a spend for it. */
export function proofState(
  proof: FinanceProof,
  hasProposal: boolean,
): ProofState {
  if (proof.dismissedAt) return "dismissed";
  if (proof.lineId) return "attached";
  if (proof.readState === "pending") return "reading";
  if (!proofTrusted(proof)) return "toCheck";
  if (proof.kind === "other") return "other";
  return hasProposal ? "proposed" : "waiting";
}

/** « À traiter »: neither attached nor set aside. */
export const proofOpen = (proof: FinanceProof) =>
  !proof.lineId && !proof.dismissedAt;

export type ValueSource =
  | { kind: "text" }
  | { kind: "photo" }
  | { kind: "notFound" }
  | { kind: "changed"; by: string | null }
  | { kind: "checked"; by: string | null }
  | { kind: "none" };

/** Where a value comes from, said beside it in the sheet: « Lu dans le
 * PDF », « À vérifier : photo », « Modifié par … ». */
export function valueSource(
  proof: FinanceProof,
  value: ProofValue,
): ValueSource {
  const key =
    value === "amount" ? "amountCents" : value === "vat" ? "vatCents" : value;
  const now = proof.values[key];
  const before = proof.read?.[key] ?? null;
  if (proof.checkedAt)
    return now !== before
      ? { kind: "changed", by: proof.checkedBy }
      : { kind: "checked", by: proof.checkedBy };
  if (now === null) return { kind: "none" };
  if (proof.verified[value]) return { kind: "text" };
  return isPhoto(proof) ? { kind: "photo" } : { kind: "notFound" };
}

/** The money a receipt says without its VAT, for « Créer la dépense »
 * (a spend is entered HT): its VAT when read, else the common 20 %. */
export function proofHtCents(values: ProofReading): number | null {
  if (values.amountCents === null) return null;
  if (values.vatCents !== null && values.vatCents < values.amountCents)
    return values.amountCents - values.vatCents;
  return Math.round(values.amountCents / 1.2);
}
