import "server-only";

import type { InvoiceStateRow } from "@/lib/legal/invoices/journey";
import { createClient } from "@/lib/supabase/server";

/** Where each invoice of a project stands, for the Juridique's journey
 * (legal_invoice_states: the state only, never the invoice). */
export async function loadInvoiceStates(
  projectId: string,
): Promise<InvoiceStateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("legal_invoice_states", {
    p_project_id: projectId,
  });
  if (error) console.error("loadInvoiceStates:", error.message);
  return (data ?? []).map((row) => ({
    contactId: row.contact_id,
    state: row.state === "to_pay" || row.state === "paid" ? row.state : "asked",
  }));
}
