// The invoices a record's side sheet lists (a Réseau contact's, a
// contract's): their state computed by the code. Client-safe.

export type SheetInvoiceState = "requested" | "to_pay" | "late" | "paid";

export type SheetInvoice = {
  id: string;
  label: string;
  href: string;
  amountCents: number | null;
  dueOn: string | null;
  state: SheetInvoiceState;
};
