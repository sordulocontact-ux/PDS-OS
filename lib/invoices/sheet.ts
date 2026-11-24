import "server-only";

import { todayInParis } from "@/lib/insights/dates";
import { invoiceHref } from "@/lib/invoices/href";
import type {
  SheetInvoice,
  SheetInvoiceState,
} from "@/lib/invoices/sheet-types";
import { createClient } from "@/lib/supabase/server";

// The invoices of a record's side sheet (§ 6.7 bis): the ones a contact
// sent PDS, or the ones of a contract, newest first, read with the
// viewer's session (RLS leaves out what they may not see).

const LIMIT = 20;

function stateOf(
  row: {
    received_at: string | null;
    paid_on: string | null;
    due_on: string | null;
  },
  today: string,
): SheetInvoiceState {
  if (row.paid_on) return "paid";
  if (row.due_on && row.due_on < today) return "late";
  return row.received_at ? "to_pay" : "requested";
}

export async function loadSheetInvoices(
  of: { contactId: string } | { contractId: string },
): Promise<SheetInvoice[]> {
  const supabase = await createClient();
  const today = todayInParis();
  const query = supabase
    .from("project_invoices")
    .select(
      "id, origin, contact_id, number, amount_cents, due_on, received_at, paid_on, project_id, project:projects!project_invoices_project_same_org(title)",
    );
  const { data, error } = await (
    "contactId" in of
      ? query.eq("contact_id", of.contactId)
      : query.eq("contract_id", of.contractId)
  )
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (error) console.error("loadSheetInvoices:", error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    label: [row.number, row.project?.title].filter(Boolean).join(" · "),
    href: invoiceHref(row.project_id, {
      id: row.id,
      origin: row.origin === "master" ? "master" : "contract",
      contactId: row.contact_id,
    }),
    amountCents: row.amount_cents,
    dueOn: row.due_on,
    state: stateOf(row, today),
  }));
}
