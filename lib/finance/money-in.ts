// The money coming in (supabase/migrations/20261113100101_treasury.sql): an
// income and the receipts that settle it, « prévu → facturé → encaissé ».
// Its state is computed here, never stored. Client-safe, pure code.

export const INCOME_KINDS = [
  "advance",
  "service",
  "label_refund",
  "rebilling",
  "distribution",
  "partnership",
  "other",
] as const;
export type IncomeKind = (typeof INCOME_KINDS)[number];

export const isIncomeKind = (value: unknown): value is IncomeKind =>
  typeof value === "string" &&
  (INCOME_KINDS as readonly string[]).includes(value);

export const REMINDER_CHANNELS = [
  "email",
  "phone",
  "meeting",
  "letter",
  "other",
] as const;
export type ReminderChannel = (typeof REMINDER_CHANNELS)[number];

export const isReminderChannel = (value: unknown): value is ReminderChannel =>
  typeof value === "string" &&
  (REMINDER_CHANNELS as readonly string[]).includes(value);

// The VAT rates of France, in basis points (2000 = 20 %).
export const VAT_RATES = [2000, 1000, 550, 210, 0] as const;

/** A file kept in Storage (bucket finance-files): its path and name. */
export type FinanceFile = { path: string; name: string; url: string | null };

/** A reminder someone made (e-mail, call…), entered after the fact. */
export type Reminder = {
  id: string;
  remindedOn: string;
  channel: ReminderChannel;
  note: string | null;
  by: string | null;
};

/** A credit note: it corrects the invoice for a part not received. */
export type CreditNote = {
  id: string;
  number: string;
  issuedOn: string;
  cents: number;
  reason: string;
  file: FinanceFile | null;
};

export type Receipt = {
  id: string;
  cents: number;
  receivedOn: string;
  note: string | null;
};

export type Income = {
  id: string;
  label: string;
  kind: IncomeKind;
  cents: number;
  contactId: string | null;
  // The contact's name, or the name only given instead.
  payer: string | null;
  projectId: string | null;
  artistId: string | null;
  expectedOn: string;
  dealId: string | null;
  ownerId: string | null;
  // VAT in basis points; null when it was not given.
  vatBp: number | null;
  invoiceNumber: string | null;
  invoicedOn: string | null;
  dueOn: string | null;
  sentOn: string | null;
  file: FinanceFile | null;
  nextAction: string | null;
  nextActionOn: string | null;
  note: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  receipts: Receipt[];
  credits: CreditNote[];
  // Latest first.
  reminders: Reminder[];
};

// The ticket's states of an invoice (« brouillon, envoyée, partiellement
// encaissée, encaissée, en retard, annulée ou avoir »), with « prévue »
// before any invoice.
export const INCOME_STATES = [
  "expected",
  "draft",
  "sent",
  "late",
  "partial",
  "received",
  "credited",
  "cancelled",
] as const;
export type IncomeState = (typeof INCOME_STATES)[number];

export const receivedCents = (income: Income) =>
  income.receipts.reduce((sum, r) => sum + r.cents, 0);

export const creditedCents = (income: Income) =>
  income.credits.reduce((sum, c) => sum + c.cents, 0);

/** What the income still awaits: its amount less what came in and what
 * credit notes took off (nothing once cancelled). */
export const remainingCents = (income: Income) =>
  income.cancelledAt
    ? 0
    : Math.max(income.cents - receivedCents(income) - creditedCents(income), 0);

/** The amount before VAT, when the VAT is known. */
export const htCents = (income: Pick<Income, "cents" | "vatBp">) =>
  income.vatBp === null
    ? null
    : Math.round((income.cents * 10000) / (10000 + income.vatBp));

/** The last reminder made, if any. */
export const lastReminder = (income: Income): Reminder | null =>
  income.reminders[0] ?? null;

/** The day the money is awaited: the invoice's due day, else the day
 * expected. */
export const awaitedOn = (income: Income) => income.dueOn ?? income.expectedOn;

/**
 * Cancelled; settled (received, or wholly credited: « avoir »); late (its
 * day passed, still awaited); partly received; sent; numbered but not sent
 * (draft); expected. A late income is the one to chase, whether it was
 * invoiced or not.
 */
export function incomeState(income: Income, today: string): IncomeState {
  if (income.cancelledAt) return "cancelled";
  const received = receivedCents(income);
  if (remainingCents(income) <= 0)
    return received > 0 ? "received" : "credited";
  if (awaitedOn(income) < today) return "late";
  if (received > 0) return "partial";
  if (income.sentOn) return "sent";
  return income.invoiceNumber ? "draft" : "expected";
}

/** Still awaited: neither received in full nor cancelled. */
export const isOpen = (income: Income) => remainingCents(income) > 0;

/** Days past the awaited day (0 when not late). */
export function daysLate(income: Income, today: string): number {
  const days =
    (Date.parse(`${today}T00:00:00Z`) -
      Date.parse(`${awaitedOn(income)}T00:00:00Z`)) /
    86400000;
  return isOpen(income) ? Math.max(Math.round(days), 0) : 0;
}
