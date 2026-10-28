import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { createClient } from "@/lib/supabase/server";

// Where each invoice of a project stands, for whoever follows it without
// reading it (the Juridique's journey, « Prêt pour la sortie »):
// project_invoice_states, never the number, the amount nor the file.

export type InvoiceStateRow = {
  invoiceId: string;
  origin: "master" | "contract";
  contactId: string;
  contactName: string;
  contractId: string | null;
  state: "asked" | "rib" | "to_pay" | "paid";
  receivedOn: string | null;
  dueOn: string | null;
  paidOn: string | null;
};

const STATES = ["asked", "rib", "to_pay", "paid"] as const;

export const loadInvoiceStates = trackedCache(
  async (projectId: string): Promise<InvoiceStateRow[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("project_invoice_states", {
      p_project_id: projectId,
    });
    if (error) console.error("loadInvoiceStates:", error.message);
    return (data ?? []).map((r) => ({
      invoiceId: r.invoice_id,
      origin: r.origin === "contract" ? "contract" : "master",
      contactId: r.contact_id,
      contactName: r.contact_name,
      contractId: r.contract_id,
      state: STATES.find((s) => s === r.state) ?? "asked",
      receivedOn: r.received_on,
      dueOn: r.due_on,
      paidOn: r.paid_on,
    }));
  },
);
