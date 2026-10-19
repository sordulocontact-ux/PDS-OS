import "server-only";

import { loadProductionCalls } from "@/lib/production/call-queries";
import { listProductionFiles } from "@/lib/production/files/queries";
import type { Holder, ProductionSheetData } from "@/lib/production/sheet";
import { createClient } from "@/lib/supabase/server";

import { agendaTopics } from "./reads";
import { cleanFields, isTeam, snapshotOf } from "./team-briefs";
import {
  budgetCategoryOf,
  callItemKindOf,
  callItemStatusOf,
  equipmentCategoryOf,
  equipmentStatusOf,
  isCheckKey,
  planStatusOf,
  preprodBudgetStatusOf,
  type PreprodData,
} from "./types";

/**
 * Everything the Préproduction tab shows for one sheet, read with the
 * user's session (RLS: whoever sees the project). Names come from the
 * sheet's members and Réseau contacts, already loaded.
 */
export async function loadPreprod(
  projectId: string,
  data: Pick<ProductionSheetData, "members" | "contacts"> & {
    sheet: { id: string };
  },
): Promise<PreprodData> {
  const sheetId = data.sheet.id;
  const supabase = await createClient();
  // The calls and files do not depend on the plan's rows: read with them,
  // then the tasks and agendas they point to (two rounds, not three).
  const [
    briefs,
    items,
    actions,
    equipment,
    budget,
    callSheet,
    checks,
    calls,
    quotes,
  ] = await Promise.all([
    supabase.from("production_team_briefs").select("*").eq("sheet_id", sheetId),
    supabase
      .from("production_call_items")
      .select("*")
      .eq("sheet_id", sheetId)
      .order("position")
      .order("created_at"),
    supabase
      .from("production_plan_actions")
      .select("*")
      .eq("sheet_id", sheetId)
      .order("position")
      .order("created_at"),
    supabase
      .from("production_equipment")
      .select("*")
      .eq("sheet_id", sheetId)
      .order("position")
      .order("created_at"),
    supabase
      .from("production_budget_lines")
      .select("*")
      .eq("sheet_id", sheetId)
      .order("position")
      .order("created_at"),
    supabase
      .from("production_call_sheets")
      .select("*")
      .eq("sheet_id", sheetId)
      .maybeSingle(),
    supabase
      .from("production_readiness_checks")
      .select("*")
      .eq("sheet_id", sheetId),
    loadProductionCalls(projectId, sheetId),
    listProductionFiles(supabase, sheetId, ["quote", "capture"]),
  ]);
  for (const res of [briefs, items, actions, equipment, budget, checks])
    if (res.error) console.error("loadPreprod:", res.error.message);

  const taskIds = (actions.data ?? []).flatMap((a) =>
    a.task_id ? [a.task_id] : [],
  );
  const [tasks, agendas] = await Promise.all([
    taskIds.length
      ? supabase.from("tasks").select("id, status").in("id", taskIds)
      : Promise.resolve({ data: [] as { id: string; status: string }[] }),
    calls.length
      ? supabase
          .from("calls")
          .select("id, agenda")
          .in(
            "id",
            calls.map((c) => c.callId),
          )
      : {
          data: [] as {
            id: string;
            agenda: Parameters<typeof agendaTopics>[0];
          }[],
        },
  ]);

  const nameOf = (id: string | null) =>
    id ? (data.members.find((m) => m.personId === id)?.name ?? "—") : null;
  const holderOf = (person: string | null, contact: string | null) =>
    person
      ? ({ kind: "person", id: person, name: nameOf(person) ?? "—" } as Holder)
      : contact
        ? ({
            kind: "contact",
            id: contact,
            name: data.contacts.find((c) => c.id === contact)?.name ?? "—",
          } as Holder)
        : null;
  const done = new Map(
    (tasks.data ?? []).map((t) => [t.id, t.status === "done"]),
  );
  const cs = callSheet.data;

  return {
    briefs: (briefs.data ?? []).flatMap((b) =>
      isTeam(b.team)
        ? [
            {
              team: b.team,
              fields: cleanFields(b.team, b.fields),
              snapshot: snapshotOf(b.snapshot),
              transmittedAt: b.transmitted_at,
              transmittedBy: nameOf(b.transmitted_by),
            },
          ]
        : [],
    ),
    calls: calls.map((c) => ({
      ...c,
      topics: agendaTopics(
        agendas.data?.find((a) => a.id === c.callId)?.agenda ?? null,
      ),
    })),
    items: (items.data ?? []).map((i) => ({
      id: i.id,
      callId: i.call_id,
      topic: i.topic,
      kind: callItemKindOf(i.kind),
      body: i.body,
      status: callItemStatusOf(i.status),
      source: i.source === "call_report" ? "call_report" : "manual",
      sourceQuote: i.source_quote,
      sourceReportItemId: i.source_report_item_id,
      reviewedBy: nameOf(i.reviewed_by),
      reviewedAt: i.reviewed_at,
    })),
    actions: (actions.data ?? []).map((a) => ({
      id: a.id,
      itemId: a.item_id,
      title: a.title,
      holder: holderOf(a.person_id, a.contact_id),
      dueDate: a.due_date,
      dependsOn: a.depends_on,
      templateKey: a.template_key,
      origin: a.origin,
      doneAt: a.done_at,
      doneBy:
        nameOf(a.done_by) ??
        (a.done_by_contact_id
          ? (holderOf(null, a.done_by_contact_id)?.name ?? null)
          : null),
      review: a.review,
      blocking: a.blocking,
      status: planStatusOf(a.status),
      approvedBy: nameOf(a.approved_by),
      approvedAt: a.approved_at,
      taskId: a.task_id,
      taskDone: a.task_id ? (done.get(a.task_id) ?? null) : null,
      note: a.note,
    })),
    equipment: (equipment.data ?? []).map((e) => ({
      id: e.id,
      category: equipmentCategoryOf(e.category),
      label: e.label,
      quantity: e.quantity,
      supplierContactId: e.supplier_contact_id,
      supplierName:
        e.supplier_name ??
        (e.supplier_contact_id
          ? (data.contacts.find((c) => c.id === e.supplier_contact_id)?.name ??
            null)
          : null),
      priceCents: e.price_cents,
      periodStart: e.period_start,
      periodEnd: e.period_end,
      depositCents: e.deposit_cents,
      returnTerms: e.return_terms,
      status: equipmentStatusOf(e.status),
      quoteFileId: e.quote_file_id,
      verifiedBy: nameOf(e.verified_by),
      verifiedAt: e.verified_at,
      returnHolder: holderOf(e.return_person_id, e.return_contact_id),
      returnDue: e.return_due,
      returnedAt: e.returned_at,
      incidentNote: e.incident_note,
      source: e.source === "loan" || e.source === "owned" ? e.source : "rental",
      receivedQuantity: e.received_quantity,
      returnIssue:
        e.return_issue === "missing" || e.return_issue === "damaged"
          ? e.return_issue
          : null,
      note: e.note,
    })),
    budget: (budget.data ?? []).map((l) => ({
      id: l.id,
      label: l.label,
      category: budgetCategoryOf(l.category),
      amountCents: l.amount_cents,
      status: preprodBudgetStatusOf(l.status),
      equipmentId: l.equipment_id,
      note: l.note,
    })),
    callSheet: cs
      ? {
          callTime: cs.call_time,
          schedule: cs.schedule,
          contactsNote: cs.contacts_note,
          sequences: cs.sequences,
          instructions: cs.instructions,
          emergencies: cs.emergencies,
          documentsNote: cs.documents_note,
          updatedBy: nameOf(cs.updated_by),
          updatedAt: cs.updated_at,
        }
      : null,
    checks: (checks.data ?? []).flatMap((c) =>
      isCheckKey(c.key)
        ? [
            {
              key: c.key,
              required: c.required,
              confirmedBy: nameOf(c.confirmed_by),
              confirmedAt: c.confirmed_at,
              note: c.note,
              holder: holderOf(c.person_id, c.contact_id),
              derogation:
                c.derogation_reason && c.derogated_at
                  ? {
                      reason: c.derogation_reason,
                      by: nameOf(c.derogated_by),
                      at: c.derogated_at,
                    }
                  : null,
            },
          ]
        : [],
    ),
    quotes,
  };
}
