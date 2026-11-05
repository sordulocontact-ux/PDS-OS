// An invoice of an external person on a project, as the team reads it
// (one system, 20/10/2026, docs/ARCHITECTURE.md § 8 ter « Factures »).
// Client-safe types and the state computed from the row, never stored.

// What it pays: the engineer's Master, or a signed contract's fee.
export type InvoiceOrigin = "master" | "contract";

/** What was agreed: the engineer's rates (with their parts), or the fee. */
export type InvoiceExpected = {
  total: number;
  mix: number | null;
  mastering: number | null;
} | null;

export type BankAccount = {
  id: string;
  iban: string;
  masked: string;
  holder: string;
  at: string;
  // Who confirmed it; null with a verified account: the first RIB the
  // person gave on their own link.
  by: string | null;
  source: "link" | "member";
};

export type ProjectInvoice = {
  id: string;
  origin: InvoiceOrigin;
  contactId: string;
  contactName: string;
  // PDS OS can e-mail this person itself (SMTP set, address in the Réseau).
  canEmail: boolean;
  // A contract's invoice: the contract and its title.
  contractId: string | null;
  contractTitle: string | null;
  requestedAt: string;
  expected: InvoiceExpected;
  number: string | null;
  amountCents: number | null;
  reason: string | null;
  fileName: string | null;
  fileUrl: string | null;
  receivedAt: string | null;
  receivedOn: string | null;
  dueOn: string | null;
  viaLink: boolean;
  receivedBy: string | null;
  paidOn: string | null;
  paidBy: string | null;
  proofName: string | null;
  // The direction only.
  proofUrl: string | null;
  // What anyone of the team may know (never a digit).
  bankState: "none" | "pending" | "verified";
  // The digits, for the direction only.
  bank: { current: BankAccount | null; pending: BankAccount | null } | null;
};

export type ProjectInvoicesView = {
  invoices: ProjectInvoice[];
  isDirection: boolean;
  // The owner or the direction adds an invoice received otherwise.
  canAdd: boolean;
  // Who pays (« En attente de Claire Morel »).
  direction: string | null;
};

/** Where an invoice stands: asked, received with a new RIB to confirm,
 * to pay, paid. */
export type InvoiceState = "requested" | "rib" | "to_pay" | "paid";

export function invoiceState(
  i: Pick<ProjectInvoice, "receivedAt" | "paidOn" | "bankState">,
): InvoiceState {
  if (i.paidOn) return "paid";
  if (!i.receivedAt) return "requested";
  return i.bankState === "pending" ? "rib" : "to_pay";
}
