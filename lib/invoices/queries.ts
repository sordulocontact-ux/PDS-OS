import "server-only";

import { cache } from "react";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { withDownloadName } from "@/lib/catalog/file-rules";
import { loadDirectionPerson } from "@/lib/master-workflow/journey-context";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

import { maskIban } from "./rules";
import type {
  BankAccount,
  InvoiceExpected,
  ProjectInvoice,
  ProjectInvoicesView,
} from "./types";

// Every invoice of a project's external people (one system, 20/10/2026),
// read with the session: the owner and the direction read the invoices
// like the budget (RLS); the RIB's digits and the proof of transfer, the
// direction alone. Who may act is said by the database; the flags here
// only lay the screen out.

type Named = { first_name: string; last_name: string | null } | null;
const nameOf = (p: Named) => (p ? personName(p.first_name, p.last_name) : null);

const SELECT =
  "id, origin, contact_id, contract_id, financial_need_id, requested_at, number, amount_cents, gap_reason, file_bucket, file_path, file_name, received_at, received_on, due_on, received_via, paid_on, proof_bucket, proof_path, proof_name, contact:network_contacts!project_invoices_contact_same_org(name), receiver:people!project_invoices_received_by_fkey(first_name, last_name), payer:people!project_invoices_paid_by_fkey(first_name, last_name)";

export const loadProjectInvoices = cache(
  async (
    projectId: string,
    ownerPersonId: string | null,
  ): Promise<ProjectInvoicesView> => {
    const access = await requireApproved();
    const supabase = await createClient();
    const isDirection = can(access, "validate");
    const { data, error } = await supabase
      .from("project_invoices")
      .select(SELECT)
      .eq("project_id", projectId)
      .order("requested_at")
      .order("id");
    if (error) console.error("loadProjectInvoices:", error.message);
    const rows = data ?? [];
    const contacts = [...new Set(rows.map((r) => r.contact_id))];
    const contracts = rows.flatMap((r) =>
      r.contract_id ? [r.contract_id] : [],
    );
    const needs = rows.flatMap((r) =>
      r.financial_need_id ? [r.financial_need_id] : [],
    );
    const files = (bucket: string) =>
      rows.flatMap((r) => [
        ...(r.file_bucket === bucket && r.file_path ? [r.file_path] : []),
        ...(isDirection && r.proof_bucket === bucket && r.proof_path
          ? [r.proof_path]
          : []),
      ]);
    const buckets = [
      ...new Set(
        rows.flatMap((r) => [r.file_bucket, r.proof_bucket].filter(Boolean)),
      ),
    ] as string[];
    const [states, accounts, titles, fees, expected, signed, director] =
      await Promise.all([
        Promise.all(
          contacts.map((c) =>
            supabase
              .rpc("contact_bank_state", { p_contact_id: c })
              .then(({ data: s }) => [c, s] as const),
          ),
        ),
        isDirection && contacts.length
          ? supabase
              .from("contact_bank_accounts")
              .select(
                "id, contact_id, iban, holder, source, created_at, verified_at, verifier:people!contact_bank_accounts_verified_by_fkey(first_name, last_name), author:people!contact_bank_accounts_created_by_fkey(first_name, last_name)",
              )
              .in("contact_id", contacts)
              .is("superseded_at", null)
          : Promise.resolve({ data: [] }),
        contracts.length
          ? supabase.from("contracts").select("id, title").in("id", contracts)
          : Promise.resolve({ data: [] }),
        needs.length
          ? supabase
              .from("financial_needs")
              .select("id, amount_cents")
              .in("id", needs)
          : Promise.resolve({ data: [] }),
        loadMasterExpected(
          projectId,
          rows.some((r) => r.origin === "master"),
        ),
        Promise.all(
          buckets.map((b) =>
            files(b).length
              ? supabase.storage
                  .from(b)
                  .createSignedUrls(files(b), 3600)
                  .then(({ data: d }) => d ?? [])
              : Promise.resolve([]),
          ),
        ),
        rows.some((r) => r.received_at && !r.paid_on)
          ? loadDirectionPerson()
          : Promise.resolve(null),
      ]);
    const stateOf = new Map(states);
    const urlOf = new Map(
      signed
        .flat()
        .flatMap((s) =>
          s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [],
        ),
    );
    const titleOf = new Map((titles.data ?? []).map((c) => [c.id, c.title]));
    const feeOf = new Map((fees.data ?? []).map((n) => [n.id, n.amount_cents]));
    const account = (
      a: NonNullable<typeof accounts.data>[number],
    ): BankAccount => ({
      id: a.id,
      iban: a.iban,
      masked: maskIban(a.iban),
      holder: a.holder,
      at: a.verified_at ?? a.created_at,
      by: a.verified_at ? nameOf(a.verifier) : nameOf(a.author),
      source: a.source === "member" ? "member" : "link",
    });
    const url = (path: string | null, name: string | null) => {
      const u = path ? urlOf.get(path) : undefined;
      return u ? withDownloadName(u, name ?? "facture.pdf") : null;
    };

    const invoices = rows.map((r): ProjectInvoice => {
      const own = (accounts.data ?? []).filter(
        (a) => a.contact_id === r.contact_id,
      );
      const current = own.find((a) => a.verified_at);
      const pending = own.find((a) => !a.verified_at);
      const state = stateOf.get(r.contact_id);
      const fee = r.financial_need_id
        ? feeOf.get(r.financial_need_id)
        : undefined;
      const exp: InvoiceExpected =
        r.origin === "master"
          ? (expected.get(r.contact_id) ?? null)
          : fee !== undefined
            ? { total: fee, mix: null, mastering: null }
            : null;
      return {
        id: r.id,
        origin: r.origin === "contract" ? "contract" : "master",
        contactId: r.contact_id,
        contactName: r.contact?.name ?? "",
        contractId: r.contract_id,
        contractTitle: r.contract_id
          ? (titleOf.get(r.contract_id) ?? null)
          : null,
        requestedAt: r.requested_at,
        expected: exp,
        number: r.number,
        amountCents: r.amount_cents,
        reason: r.gap_reason,
        fileName: r.file_name,
        fileUrl: url(r.file_path, r.file_name),
        receivedAt: r.received_at,
        receivedOn: r.received_on,
        dueOn: r.due_on,
        viaLink: r.received_via === "link",
        receivedBy: nameOf(r.receiver),
        paidOn: r.paid_on,
        paidBy: nameOf(r.payer),
        proofName: r.proof_name,
        proofUrl: isDirection ? url(r.proof_path, r.proof_name) : null,
        bankState: state === "pending" || state === "verified" ? state : "none",
        bank: isDirection
          ? {
              current: current ? account(current) : null,
              pending: pending ? account(pending) : null,
            }
          : null,
      };
    });
    return {
      invoices,
      isDirection,
      canAdd:
        isDirection ||
        (access.personId !== null && access.personId === ownerPersonId),
      direction: director?.name ?? null,
    };
  },
);

/** What each engineer was committed (« mix 800 € · mastering 300 € »):
 * the amount agreed of their roles' lines, even once an invoice moved it. */
async function loadMasterExpected(
  projectId: string,
  needed: boolean,
): Promise<Map<string, NonNullable<InvoiceExpected>>> {
  const out = new Map<string, NonNullable<InvoiceExpected>>();
  if (!needed) return out;
  const supabase = await createClient();
  const [lines, brief] = await Promise.all([
    supabase
      .from("budget_lines")
      .select("master_role, amount_cents, committed_cents, status")
      .eq("project_id", projectId)
      .not("master_role", "is", null)
      .in("status", ["committed", "invoiced", "paid"]),
    supabase
      .from("master_briefs")
      .select("mix_contact_id, mastering_contact_id, mastering_same_engineer")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);
  const b = brief.data;
  if (!b) return out;
  const masteringOf = b.mastering_same_engineer
    ? b.mix_contact_id
    : b.mastering_contact_id;
  const agreed = (role: string) =>
    (lines.data ?? [])
      .filter((l) => l.master_role === role)
      .reduce((s, l) => s + (l.committed_cents ?? l.amount_cents), 0);
  const has = (role: string) =>
    (lines.data ?? []).some((l) => l.master_role === role);
  for (const contact of new Set([b.mix_contact_id, masteringOf])) {
    if (!contact) continue;
    const mix =
      b.mix_contact_id === contact && has("mix") ? agreed("mix") : null;
    const mastering =
      masteringOf === contact && has("mastering") ? agreed("mastering") : null;
    if (mix === null && mastering === null) continue;
    out.set(contact, { total: (mix ?? 0) + (mastering ?? 0), mix, mastering });
  }
  return out;
}
