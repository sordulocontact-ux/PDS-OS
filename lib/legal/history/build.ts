// Turns the rows of every journal of a project's Juridique into one list
// of events, newest first (JUR-29). Pure: no read, no write; every line
// comes from a row really recorded. Client-safe.

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { linkCauses } from "@/lib/legal/history/causes";
import type { LegalEvent } from "@/lib/legal/history/types";
import { formatDate } from "@/lib/release/format";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
type Row<T extends keyof Tables, K extends keyof Tables[T]["Row"]> = Pick<
  Tables[T]["Row"],
  K
>;

// The filing, the result and a signature carry the proof typed by hand;
// the other notes of a formality are reasons.
const PROOF_KINDS = new Set([
  "formality.submitted",
  "formality.completed",
  "signature.completed",
]);

export type HistoryRows = {
  projectId: string;
  masters: Array<{ id: string; title: string }>;
  members: Array<{ personId: string; name: string }>;
  plans: Row<
    "legal_plans",
    "id" | "confirmed_at" | "confirmed_by" | "launched_at" | "launched_by"
  >[];
  planItems: Row<"legal_plan_items", "id" | "label">[];
  planEvents: Row<
    "legal_plan_events",
    | "id"
    | "item_id"
    | "kind"
    | "from_value"
    | "to_value"
    | "reason"
    | "created_by"
    | "created_at"
  >[];
  intakes: Row<"legal_intakes", "id" | "confirmed_at" | "confirmed_by">[];
  forms: Row<
    "legal_forms",
    | "id"
    | "contact_id"
    | "created_at"
    | "created_by"
    | "sent_at"
    | "submitted_at"
    | "completed_at"
    | "revoked_at"
  >[];
  contracts: Row<"contracts", "id" | "title">[];
  clearances: Row<"legal_clearances", "id" | "element">[];
  sheets: Row<"legal_split_sheets", "id" | "master_id">[];
  formalities: Row<"legal_formalities", "id" | "master_id">[];
  versions: Row<"legal_split_versions", "id" | "sheet_id" | "version">[];
  contacts: Row<"network_contacts", "id" | "name">[];
  contractEvents: Row<
    "contract_events",
    "id" | "contract_id" | "kind" | "note" | "actor_person_id" | "created_at"
  >[];
  clearanceEvents: Row<
    "legal_clearance_events",
    "id" | "clearance_id" | "kind" | "note" | "actor_person_id" | "created_at"
  >[];
  splitEvents: Row<
    "legal_split_events",
    | "id"
    | "version_id"
    | "entry_id"
    | "kind"
    | "note"
    | "actor_person_id"
    | "created_at"
  >[];
  entries: Row<"legal_split_entries", "id" | "name">[];
  formEvents: Row<
    "legal_formality_events",
    "id" | "formality_id" | "kind" | "note" | "actor_person_id" | "created_at"
  >[];
  signatures: Row<
    "legal_formality_signatures",
    | "id"
    | "formality_id"
    | "signer"
    | "signed_at"
    | "proof"
    | "recorded_by"
    | "document_version"
  >[];
};

export function buildLegalEvents(r: HistoryRows): LegalEvent[] {
  const t = fr.legalHistory;
  const nameOf = new Map(r.members.map((m) => [m.personId, m.name]));
  const who = (id: string | null) => (id ? (nameOf.get(id) ?? null) : null);
  const titleOf = new Map(r.masters.map((m) => [m.id, m.title]));
  const step = (s: string) => routes.projectLegalStep(r.projectId, s);
  const contactName = new Map(r.contacts.map((c) => [c.id, c.name]));
  const events: LegalEvent[] = [];
  const add = (
    e: Omit<LegalEvent, "note" | "manualProof"> &
      Partial<Pick<LegalEvent, "note" | "manualProof">>,
  ) => events.push({ note: null, manualProof: null, ...e });

  for (const i of r.intakes)
    if (i.confirmed_at)
      add({
        id: `intake:${i.id}`,
        kind: "intake.confirmed",
        object: `intake:${i.id}`,
        at: i.confirmed_at,
        branch: "inventory",
        action: t.intakeConfirmed,
        subject: null,
        by: who(i.confirmed_by),
        href: routes.projectLegalStep(r.projectId, "confirmation"),
      });

  for (const plan of r.plans) {
    if (plan.confirmed_at)
      add({
        id: `plan-confirmed:${plan.id}`,
        kind: "plan.confirmed",
        object: `plan:${plan.id}`,
        at: plan.confirmed_at,
        branch: "plan",
        action: t.planConfirmed,
        subject: null,
        by: who(plan.confirmed_by),
        href: step("plan"),
      });
    if (plan.launched_at)
      add({
        id: `plan-launched:${plan.id}`,
        kind: "plan.launched",
        object: `plan:${plan.id}`,
        at: plan.launched_at,
        branch: "plan",
        action: t.planLaunched,
        subject: null,
        by: who(plan.launched_by),
        href: step("plan"),
      });
  }
  const itemLabel = new Map(r.planItems.map((i) => [i.id, i.label]));
  for (const e of r.planEvents) {
    const value = (v: string | null) =>
      e.kind === "due_changed"
        ? v
          ? formatDate(v)
          : t.noDate
        : (who(v) ?? t.nobody);
    const text =
      e.kind === "due_changed"
        ? t.planEvents.due_changed(value(e.from_value), value(e.to_value))
        : t.planEvents.responsible_changed(
            value(e.from_value),
            value(e.to_value),
          );
    add({
      id: `plan:${e.id}`,
      kind: e.kind,
      object: `plan-item:${e.item_id}`,
      at: e.created_at,
      branch: "plan",
      action: text,
      subject: itemLabel.get(e.item_id) ?? null,
      by: who(e.created_by),
      note: e.reason,
      href: step("plan"),
    });
  }

  for (const f of r.forms) {
    const subject = contactName.get(f.contact_id) ?? null;
    const moments = [
      ["prepared", f.created_at, who(f.created_by)],
      ["sent", f.sent_at, null],
      ["submitted", f.submitted_at, t.external],
      ["completed", f.completed_at, null],
      ["revoked", f.revoked_at, null],
    ] as const;
    for (const [kind, at, by] of moments)
      if (at)
        add({
          id: `form-${kind}:${f.id}`,
          kind: `form.${kind}`,
          object: `form:${f.id}`,
          at,
          branch: "forms",
          action: t.forms[kind],
          subject,
          by,
          href: step("forms"),
        });
  }

  const contractTitle = new Map(r.contracts.map((c) => [c.id, c.title]));
  const contractLabels = fr.legalContracts.document.events;
  for (const e of r.contractEvents)
    add({
      id: `contract:${e.id}`,
      kind: e.kind,
      object: e.contract_id ? `contract:${e.contract_id}` : null,
      at: e.created_at,
      branch: "contracts",
      action: contractLabels[e.kind] ?? e.kind,
      subject: e.contract_id
        ? (contractTitle.get(e.contract_id) ?? null)
        : null,
      // A signed copy deposited by a private link: by the person named.
      by:
        who(e.actor_person_id) ??
        (e.kind === "signature.received" && e.note ? e.note : t.system),
      note: e.kind === "signature.received" ? null : e.note,
      href: e.contract_id ? routes.contract(e.contract_id) : step("contracts"),
    });

  const element = new Map(r.clearances.map((c) => [c.id, c.element]));
  for (const e of r.clearanceEvents)
    add({
      id: `clearance:${e.id}`,
      kind: e.kind,
      object: `clearance:${e.clearance_id}`,
      at: e.created_at,
      branch: "clearances",
      action: fr.legalClearance.events[e.kind] ?? e.kind,
      subject: element.get(e.clearance_id) ?? null,
      by: who(e.actor_person_id),
      note: e.note,
      href: `${step("clearances")}?emprunt=${e.clearance_id}`,
    });

  const sheetTitle = new Map(
    r.sheets.map((s) => [s.id, titleOf.get(s.master_id) ?? null]),
  );
  const versionOf = new Map(r.versions.map((v) => [v.id, v]));
  const entryName = new Map(r.entries.map((e) => [e.id, e.name]));
  for (const e of r.splitEvents) {
    const v = versionOf.get(e.version_id);
    const title = v ? sheetTitle.get(v.sheet_id) : null;
    const person = e.entry_id ? entryName.get(e.entry_id) : null;
    add({
      id: `split:${e.id}`,
      kind: e.kind,
      object: v ? `split:${v.sheet_id}` : null,
      at: e.created_at,
      branch: "splits",
      action: t.splits[e.kind] ?? e.kind,
      subject:
        [title, v ? t.version(v.version) : null, person]
          .filter(Boolean)
          .join(" · ") || null,
      // A confirmation or a dispute without an actor came through the link.
      by: who(e.actor_person_id) ?? (person ? t.external : t.system),
      note: e.note,
      href: step("splits"),
    });
  }

  const formalityTitle = new Map(
    r.formalities.map((f) => [f.id, t.sacem(titleOf.get(f.master_id) ?? "")]),
  );
  for (const e of r.formEvents)
    add({
      id: `formality:${e.id}`,
      kind: e.kind,
      object: `formality:${e.formality_id}`,
      at: e.created_at,
      branch: "formalities",
      action: fr.legalFormalities.events[e.kind] ?? e.kind,
      subject: formalityTitle.get(e.formality_id) ?? null,
      // A signature deposited by a private link: by the signer named.
      by:
        who(e.actor_person_id) ??
        (e.kind === "signature.completed" && e.note ? e.note : t.system),
      ...(PROOF_KINDS.has(e.kind) ? { manualProof: e.note } : { note: e.note }),
      href: step("formalities"),
    });
  for (const s of r.signatures)
    if (s.signed_at)
      add({
        id: `signature:${s.id}`,
        kind: "signature",
        object: `formality:${s.formality_id}`,
        version: s.document_version,
        at: s.signed_at,
        branch: "formalities",
        action: t.signature(s.signer),
        subject: [
          formalityTitle.get(s.formality_id),
          t.version(s.document_version),
        ]
          .filter(Boolean)
          .join(" · "),
        by: who(s.recorded_by),
        manualProof: s.proof,
        href: step("formalities"),
      });

  // Newest first; same instant: a stable order by id.
  events.sort((a, b) =>
    a.at === b.at ? a.id.localeCompare(b.id) : b.at.localeCompare(a.at),
  );
  return linkCauses(events);
}
