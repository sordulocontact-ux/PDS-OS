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
import { createClient } from "@/lib/supabase/server";

// The clearances of a project (ticket Juridique 05), with everything their
// drawer shows, read with the viewer's session (RLS: manage_legal).

export async function loadClearances(
  project: { id: string; masters: Array<{ id: string; title: string }> },
  access: Access,
): Promise<Clearances> {
  const supabase = await createClient();
  const today = todayInParis(new Date());
  const [rows, people, contracts] = await Promise.all([
    supabase
      .from("legal_clearances")
      .select(
        "id, master_id, element, work, author, status, usage, rights_scope, scope_reason, responsible_person_id",
      )
      .eq("project_id", project.id)
      .order("created_at"),
    access.organizationId
      ? listLegalPeople(access.organizationId)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("contracts")
      .select("id, title, status, ends_on")
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
            .select("id, clearance_id, right, name, role")
            .in("clearance_id", ids)
            .order("created_at"),
          supabase
            .from("legal_clearance_communications")
            .select(
              "id, clearance_id, kind, direction, body, occurred_at, created_by",
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
  const files =
    contractIds.length > 0
      ? await supabase
          .from("contract_files")
          .select("contract_id, category")
          .in("contract_id", contractIds)
      : none;
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
              },
            ];
          }),
        history: (events.data ?? [])
          .filter((e) => e.clearance_id === row.id)
          .map((e) => ({
            id: e.id,
            kind: e.kind,
            from: e.from_status,
            to: e.to_status,
            note: e.note,
            at: e.created_at,
            by: who(e.actor_person_id),
          })),
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
  };
}
