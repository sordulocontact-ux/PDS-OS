import "server-only";

import { cache } from "react";

import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// The invoices of the people paid by their contract (J10, proto « Projet
// complet »), read with the viewer's session: the direction reads each
// invoice (RLS « validate »); the Juridique only where each one stands
// (legal_invoice_states). Never the IBAN: PDS OS keeps none.

export type InvoiceState = "asked" | "to_pay" | "paid";

export type InvoiceView = {
  id: string;
  number: string;
  amountCents: number;
  gapReason: string | null;
  fileName: string;
  fileUrl: string | null;
  receivedOn: string;
  dueOn: string;
  via: "link" | "team";
  createdAt: string;
  addedBy: string | null;
  paid: {
    on: string;
    by: string;
    proof: string;
    proofUrl: string | null;
  } | null;
};

export type ContractInvoice = {
  needId: string;
  contactId: string;
  // The fee agreed: what the invoice is compared to.
  amountCents: number;
  state: InvoiceState;
  dueOn: string | null;
  // The direction only.
  invoice: InvoiceView | null;
};

const asState = (s: string): InvoiceState =>
  s === "to_pay" || s === "paid" ? s : "asked";

/** Per contract id: its financial need, the invoice's state and, for the
 * direction, the invoice itself with its files (signed URLs, 10 minutes). */
export const loadContractInvoices = cache(
  async (
    projectId: string,
    canValidate: boolean,
  ): Promise<Record<string, ContractInvoice>> => {
    const supabase = await createClient();
    const [needs, states, invoices] = await Promise.all([
      supabase
        .from("financial_needs")
        .select("id, contract_id, contact_id, amount_cents")
        .eq("project_id", projectId),
      supabase.rpc("legal_invoice_states", { p_project_id: projectId }),
      canValidate
        ? supabase
            .from("legal_invoices")
            .select(
              "id, financial_need_id, number, amount_cents, gap_reason, file_name, file_path, received_on, due_on, submitted_via, added_by, created_at, paid_on, paid_by, paid_proof_name, paid_proof_path",
            )
            .eq("project_id", projectId)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (needs.error)
      console.error("loadContractInvoices:", needs.error.message);
    const rows = invoices.data ?? [];
    const paths = rows.flatMap((r) =>
      [r.file_path, r.paid_proof_path].filter((p): p is string => Boolean(p)),
    );
    const people = [
      ...new Set(rows.flatMap((r) => [r.added_by, r.paid_by]).filter(Boolean)),
    ] as string[];
    const [signed, names] = await Promise.all([
      paths.length > 0
        ? supabase.storage.from("legal-invoices").createSignedUrls(paths, 600)
        : Promise.resolve({ data: [] }),
      people.length > 0
        ? supabase
            .from("people")
            .select("id, first_name, last_name")
            .in("id", people)
        : Promise.resolve({ data: [] }),
    ]);
    const urlOf = new Map(
      (signed.data ?? []).flatMap((s) =>
        s.path && s.signedUrl ? [[s.path, s.signedUrl]] : [],
      ),
    );
    const nameOf = new Map(
      (names.data ?? []).map((p) => [
        p.id,
        personName(p.first_name, p.last_name),
      ]),
    );
    const stateOf = new Map(
      (states.data ?? []).map((s) => [s.financial_need_id, s]),
    );
    const out: Record<string, ContractInvoice> = {};
    for (const need of needs.data ?? []) {
      const st = stateOf.get(need.id);
      const row = rows.find((r) => r.financial_need_id === need.id);
      out[need.contract_id] = {
        needId: need.id,
        contactId: need.contact_id,
        amountCents: need.amount_cents,
        state: asState(st?.state ?? "asked"),
        dueOn: st?.due_on ?? null,
        invoice: row
          ? {
              id: row.id,
              number: row.number,
              amountCents: row.amount_cents,
              gapReason: row.gap_reason,
              fileName: row.file_name,
              fileUrl: urlOf.get(row.file_path) ?? null,
              receivedOn: row.received_on,
              dueOn: row.due_on,
              via: row.submitted_via === "team" ? "team" : "link",
              createdAt: row.created_at,
              addedBy: row.added_by ? (nameOf.get(row.added_by) ?? null) : null,
              paid:
                row.paid_on && row.paid_by
                  ? {
                      on: row.paid_on,
                      by: nameOf.get(row.paid_by) ?? "—",
                      proof: row.paid_proof_name ?? "",
                      proofUrl: row.paid_proof_path
                        ? (urlOf.get(row.paid_proof_path) ?? null)
                        : null,
                    }
                  : null,
            }
          : null,
      };
    }
    return out;
  },
);
