import "server-only";

import { cache } from "react";

import { can, type Access } from "@/lib/auth/access";
import { withDownloadName } from "@/lib/catalog/file-rules";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

import { invoiceDueOn, maskIban } from "./invoice-rules";

// The engineers' invoices of a project, as the team reads them in the
// Master final (docs/projet-complet/master.md § 9). Read with the session:
// the owner and the direction see the invoices and the budget (RLS); the
// RIB's digits and the proof of the transfer, the direction alone. Who may
// act is said by the database; the flags here only lay the screen out.

type Named = { first_name: string; last_name: string | null } | null;
const nameOf = (p: Named) => (p ? personName(p.first_name, p.last_name) : null);

export type BankAccount = {
  id: string;
  iban: string;
  masked: string;
  holder: string;
  at: string;
  // verified_by: who confirmed it; null with `verified`: the first RIB
  // the engineer gave on their own link.
  by: string | null;
  source: "link" | "member";
};

export type TeamInvoice = {
  id: string;
  contactId: string;
  contactName: string;
  requestedAt: string;
  expected: {
    total: number;
    mix: number | null;
    mastering: number | null;
  } | null;
  number: string | null;
  amountCents: number | null;
  reason: string | null;
  fileName: string | null;
  fileUrl: string | null;
  receivedAt: string | null;
  viaLink: boolean;
  receivedBy: string | null;
  bankChanged: boolean;
  dueOn: string | null;
  paidOn: string | null;
  paidBy: string | null;
  proofName: string | null;
  // What anyone of the team may know (never a digit).
  bankState: "none" | "pending" | "verified";
  // The digits, for the direction only.
  bank: { current: BankAccount | null; pending: BankAccount | null } | null;
};

export type MasterBudgetLine = {
  stage: "mix" | "mastering";
  label: string;
  amountCents: number;
  status: string;
  note: string | null;
  updatedAt: string;
};

export type MasterInvoicesView = {
  invoices: TeamInvoice[];
  budget: MasterBudgetLine[];
  isDirection: boolean;
  canAddOther: boolean;
  direction: string | null;
};

export const loadMasterInvoices = cache(
  async (
    projectId: string,
    access: Access,
    ownerPersonId: string | null,
  ): Promise<MasterInvoicesView> => {
    const supabase = await createClient();
    const isDirection = can(access, "validate");
    const [invoices, lines, brief, director] = await Promise.all([
      supabase
        .from("master_invoices")
        .select(
          "id, contact_id, requested_at, number, amount_cents, amount_reason, file_path, file_name, received_at, received_via, bank_changed, paid_on, contact:network_contacts!master_invoices_contact_same_org(name), receiver:people!master_invoices_received_by_fkey(first_name, last_name), payer:people!master_invoices_paid_by_fkey(first_name, last_name)",
        )
        .eq("project_id", projectId)
        .order("requested_at"),
      supabase
        .from("budget_lines")
        .select("master_role, label, amount_cents, status, note, updated_at")
        .eq("project_id", projectId)
        .not("master_role", "is", null)
        .order("master_role", { ascending: false }),
      supabase
        .from("master_briefs")
        .select("mix_contact_id, mastering_contact_id, mastering_same_engineer")
        .eq("project_id", projectId)
        .maybeSingle(),
      supabase
        .from("memberships")
        .select(
          "person:people!memberships_person_id_fkey(first_name, last_name)",
        )
        .eq("role", "general_director")
        .eq("status", "approved")
        .limit(1)
        .maybeSingle(),
    ]);
    if (invoices.error)
      console.error("loadMasterInvoices:", invoices.error.message);
    const rows = invoices.data ?? [];
    const ids = rows.map((r) => r.id);
    const contacts = [...new Set(rows.map((r) => r.contact_id))];
    const [states, accounts, proofs, signed] = await Promise.all([
      Promise.all(
        contacts.map((c) =>
          supabase
            .rpc("contact_bank_state", { p_contact_id: c })
            .then(({ data }) => [c, data] as const),
        ),
      ),
      isDirection && contacts.length
        ? supabase
            .from("contact_bank_accounts")
            .select(
              "id, contact_id, iban, holder, source, created_at, verified_at, superseded_at, verifier:people!contact_bank_accounts_verified_by_fkey(first_name, last_name), author:people!contact_bank_accounts_created_by_fkey(first_name, last_name)",
            )
            .in("contact_id", contacts)
            .is("superseded_at", null)
        : Promise.resolve({ data: [] }),
      isDirection && ids.length
        ? supabase
            .from("master_payment_proofs")
            .select("invoice_id, file_name")
            .in("invoice_id", ids)
        : Promise.resolve({ data: [] }),
      rows.some((r) => r.file_path)
        ? supabase.storage.from("master-finance").createSignedUrls(
            rows.flatMap((r) => (r.file_path ? [r.file_path] : [])),
            3600,
          )
        : Promise.resolve({ data: [] }),
    ]);
    const stateOf = new Map(states);
    const urlOf = new Map(
      (signed.data ?? []).flatMap((s) =>
        s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [],
      ),
    );
    const b = brief.data;
    const rolesOf = (contact: string) =>
      [
        b?.mix_contact_id === contact ? "mix" : null,
        (b?.mastering_same_engineer && b.mix_contact_id === contact) ||
        (!b?.mastering_same_engineer && b?.mastering_contact_id === contact)
          ? "mastering"
          : null,
      ].filter(Boolean);
    const engaged = (lines.data ?? []).filter((l) =>
      ["committed", "invoiced", "paid"].includes(l.status),
    );
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

    return {
      isDirection,
      canAddOther:
        access.personId !== null && access.personId === ownerPersonId,
      direction: nameOf(director.data?.person ?? null),
      budget: (lines.data ?? []).flatMap((l) =>
        l.master_role === "mix" || l.master_role === "mastering"
          ? [
              {
                stage: l.master_role,
                label: l.label,
                amountCents: l.amount_cents,
                status: l.status,
                note: l.note,
                updatedAt: l.updated_at,
              },
            ]
          : [],
      ),
      invoices: rows.map((r) => {
        const mine = engaged.filter((l) =>
          rolesOf(r.contact_id).includes(l.master_role ?? ""),
        );
        const sum = (stage?: string) =>
          mine
            .filter((l) => !stage || l.master_role === stage)
            .reduce((s, l) => s + l.amount_cents, 0);
        const own = (accounts.data ?? []).filter(
          (a) => a.contact_id === r.contact_id,
        );
        const current = own.find((a) => a.verified_at);
        const pending = own.find((a) => !a.verified_at);
        const state = stateOf.get(r.contact_id);
        return {
          id: r.id,
          contactId: r.contact_id,
          contactName: r.contact?.name ?? "",
          requestedAt: r.requested_at,
          expected: mine.length
            ? {
                total: sum(),
                mix: mine.some((l) => l.master_role === "mix")
                  ? sum("mix")
                  : null,
                mastering: mine.some((l) => l.master_role === "mastering")
                  ? sum("mastering")
                  : null,
              }
            : null,
          number: r.number,
          amountCents: r.amount_cents,
          reason: r.amount_reason,
          fileName: r.file_name,
          fileUrl:
            r.file_path && urlOf.get(r.file_path)
              ? withDownloadName(
                  urlOf.get(r.file_path)!,
                  r.file_name ?? "facture.pdf",
                )
              : null,
          receivedAt: r.received_at,
          viaLink: r.received_via === "link",
          receivedBy: nameOf(r.receiver),
          bankChanged: r.bank_changed,
          dueOn: r.received_at ? invoiceDueOn(r.received_at) : null,
          paidOn: r.paid_on,
          paidBy: nameOf(r.payer),
          proofName:
            (proofs.data ?? []).find((p) => p.invoice_id === r.id)?.file_name ??
            null,
          bankState:
            state === "pending" || state === "verified" ? state : "none",
          bank: isDirection
            ? {
                current: current ? account(current) : null,
                pending: pending ? account(pending) : null,
              }
            : null,
        };
      }),
    };
  },
);
