import "server-only";

import { can, type Access } from "@/lib/auth/access";
import {
  asContractStatus,
  contractStateOf,
  todayInParis,
} from "@/lib/contracts/types";
import {
  nextStatus,
  type ClearanceStatus,
  type RightKind,
  type Scope,
} from "@/lib/legal/clearance/matrix";
import type { Clearance, Clearances } from "@/lib/legal/clearance/types";
import { personName } from "@/lib/projects/types";
import { listLegalPeople } from "@/lib/legal/legal-people";
import { legalClearanceRows } from "@/lib/legal/shared-rows";
import { emailEnabled } from "@/lib/email/send";
import { contractDocumentRefs } from "@/lib/legal/clearance/contract-email";
import { createClient } from "@/lib/supabase/server";

// The description receive_clearance_signed_copy gives what came by e-mail.
const RECEIVED_BY_EMAIL = "Reçu par e-mail";

// The clearances of a project (ticket Juridique 05), with everything their
// drawer shows, read with the viewer's session (RLS: manage_legal).

export async function loadClearances(
  project: { id: string; masters: Array<{ id: string; title: string }> },
  access: Access,
): Promise<Clearances> {
  const supabase = await createClient();
  const today = todayInParis(new Date());
  const [rows, people, contracts] = await Promise.all([
    legalClearanceRows(project.id),
    access.organizationId
      ? listLegalPeople(access.organizationId)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("contracts")
      .select("id, title, status, ends_on, owner_person_id")
      .eq("project_id", project.id),
  ]);
  if (rows.error) console.error("loadClearances:", rows.error.message);
  const ids = (rows.data ?? []).map((r) => r.id);
  const none = { data: [], error: null };
  const [holders, exchanges, terms, links, events] =
    ids.length > 0
      ? await Promise.all([
          supabase
            .from("legal_clearance_rightsholders")
            .select("id, clearance_id, right, name, role, contact_id, email")
            .in("clearance_id", ids)
            .order("created_at"),
          supabase
            .from("legal_clearance_communications")
            .select(
              "id, clearance_id, kind, direction, body, occurred_at, created_by, from_address",
            )
            .in("clearance_id", ids)
            .order("occurred_at", { ascending: false }),
          supabase
            .from("legal_clearance_terms")
            .select(
              "id, clearance_id, right, amount_cents, share, credits, territory, duration, other, status",
            )
            .in("clearance_id", ids)
            .order("created_at", { ascending: false }),
          supabase
            .from("legal_clearance_contracts")
            .select("clearance_id, right, contract_id")
            .in("clearance_id", ids),
          supabase
            .from("legal_clearance_events")
            .select(
              "id, clearance_id, kind, from_status, to_status, note, actor_person_id, created_at",
            )
            .in("clearance_id", ids)
            .order("created_at", { ascending: false }),
        ])
      : [none, none, none, none, none];

  const contractIds = (links.data ?? []).map((l) => l.contract_id);
  // The holders' addresses in the Réseau (the request is e-mailed to them).
  const contactIds = [
    ...new Set(
      (holders.data ?? []).flatMap((h) => (h.contact_id ? [h.contact_id] : [])),
    ),
  ];
  const [files, mails, documents] = await Promise.all([
    contractIds.length > 0
      ? supabase
          .from("contract_files")
          .select("id, contract_id, category, description, path, file_name")
          .in("contract_id", contractIds)
      : none,
    contactIds.length > 0
      ? supabase
          .from("network_contacts")
          .select("id, email, kind")
          .in("id", contactIds)
      : none,
    // What each contract is e-mailed as from « Signer ».
    contractDocumentRefs(
      supabase,
      (contracts.data ?? []).filter((c) => contractIds.includes(c.id)),
    ),
  ]);
  const emailOf = new Map(
    (mails.data ?? []).flatMap((c) => (c.email ? [[c.id, c.email]] : [])),
  );
  const kindOf = new Map(
    (mails.data ?? []).map((c) => [
      c.id,
      c.kind === "person" ? ("person" as const) : ("organization" as const),
    ]),
  );
  // The signed copy and its proof, each to open from the contract's card
  // (Sacha, 09/11/2026); one sent back by e-mail and kept by PDS OS (cron)
  // is said, to check before « Marquer comme sécurisé ».
  const proofFiles = (files.data ?? []).filter(
    (f) => f.category === "signed" || f.category === "evidence",
  );
  const proofUrls =
    proofFiles.length > 0
      ? (
          await supabase.storage.from("contract-files").createSignedUrls(
            proofFiles.map((f) => f.path),
            3600,
          )
        ).data
      : null;
  const proofOf = (contractId: string) =>
    proofFiles.flatMap((f, i) =>
      f.contract_id === contractId
        ? [
            {
              id: f.id,
              category: f.category as "signed" | "evidence",
              name: f.file_name,
              url: proofUrls?.[i]?.signedUrl ?? null,
              byEmail: f.description === RECEIVED_BY_EMAIL,
            },
          ]
        : [],
    );
  const nameOf = new Map(
    (people.data ?? []).map((p) => [
      p.person_id,
      personName(p.first_name, p.last_name),
    ]),
  );
  const who = (id: string | null) => (id ? (nameOf.get(id) ?? "") : "");
  const titleOf = new Map(project.masters.map((m) => [m.id, m.title]));
  const contractOf = new Map((contracts.data ?? []).map((c) => [c.id, c]));

  const items = await Promise.all(
    (rows.data ?? []).map(async (row): Promise<Clearance> => {
      const status = row.status as ClearanceStatus;
      const scope = row.rights_scope as Scope | null;
      // Newest first: the last move into the current state says where it
      // came from (the state to resume after a refusal).
      const before =
        (events.data ?? []).find(
          (e) => e.clearance_id === row.id && e.to_status === status,
        )?.from_status ?? null;
      const next = nextStatus(status, scope, before);
      const missing = next
        ? ((
            await supabase.rpc("clearance_missing", {
              p_clearance_id: row.id,
              p_status: next,
            })
          ).data ?? [])
        : [];
      return {
        id: row.id,
        work: row.work,
        author: row.author,
        element: row.element,
        title: row.master_id ? (titleOf.get(row.master_id) ?? null) : null,
        status,
        usage: row.usage,
        scope,
        reason: row.scope_reason,
        responsibleId: row.responsible_person_id,
        responsibleName: row.responsible_person_id
          ? (nameOf.get(row.responsible_person_id) ?? null)
          : null,
        next,
        missing,
        holders: (holders.data ?? [])
          .filter((h) => h.clearance_id === row.id)
          .map((h) => ({
            id: h.id,
            right: h.right as RightKind,
            name: h.name,
            role: h.role,
            contactId: h.contact_id,
            // The fiche's address, else the one a name-only holder was
            // e-mailed to.
            email:
              (h.contact_id ? emailOf.get(h.contact_id) : null) ??
              h.email ??
              null,
            kind: h.contact_id ? (kindOf.get(h.contact_id) ?? null) : null,
          })),
        exchanges: (exchanges.data ?? [])
          .filter((e) => e.clearance_id === row.id)
          .map((e) => ({
            id: e.id,
            kind: e.kind,
            direction: e.direction,
            body: e.body,
            at: e.occurred_at,
            by: who(e.created_by),
            from: e.from_address,
          })),
        terms: (terms.data ?? [])
          .filter((t) => t.clearance_id === row.id)
          .map((t) => ({
            id: t.id,
            right: t.right as RightKind | null,
            amountCents: t.amount_cents,
            share: t.share,
            credits: t.credits,
            territory: t.territory,
            duration: t.duration,
            other: t.other,
            status: t.status as "proposed" | "validated" | "rejected",
          })),
        contracts: (links.data ?? [])
          .filter((l) => l.clearance_id === row.id)
          .flatMap((l) => {
            const c = contractOf.get(l.contract_id);
            if (!c) return [];
            const mine = (files.data ?? []).filter(
              (f) => f.contract_id === c.id,
            );
            return [
              {
                right: l.right as RightKind,
                id: c.id,
                title: c.title,
                state: contractStateOf(
                  { status: asContractStatus(c.status), endsOn: c.ends_on },
                  today,
                ),
                signedFile: mine.some((f) => f.category === "signed"),
                evidenceFile: mine.some((f) => f.category === "evidence"),
                document: documents.get(c.id) ?? null,
                proof: proofOf(c.id),
                ownerName: c.owner_person_id
                  ? (nameOf.get(c.owner_person_id) ?? null)
                  : null,
                ownerIsViewer:
                  !!c.owner_person_id && c.owner_person_id === access.personId,
              },
            ];
          }),
      };
    }),
  );

  return {
    items,
    people: [...nameOf].map(([personId, name]) => ({ personId, name })),
    projectContracts: (contracts.data ?? []).map((c) => ({
      id: c.id,
      title: c.title,
    })),
    canValidate: can(access, "validate"),
    organizationId: access.organizationId,
    emailEnabled: emailEnabled(),
  };
}
