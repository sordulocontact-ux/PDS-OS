import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { todayInParis } from "@/lib/insights/dates";
import {
  completeFormContacts,
  noAgreementContacts,
} from "@/lib/legal/forms/queries";
import { planDueDates } from "@/lib/legal/plan/due-dates";
import { readInventoryRows } from "@/lib/legal/inventory-rows";
import {
  proposePlan,
  type PlanClearance,
  type PlanColumn,
  type PlanItem,
  type PlanItemKind,
  type PlanItemStatus,
} from "@/lib/legal/plan/proposal";
import { personName } from "@/lib/projects/types";
import { listLegalPeople } from "@/lib/legal/legal-people";
import {
  legalClearanceRows,
  legalIntakeRow,
  legalPlanRow,
} from "@/lib/legal/shared-rows";
import { createClient } from "@/lib/supabase/server";

export type PlanRow = PlanItem & {
  responsibleId: string | null;
  responsibleName: string | null;
  dueOn: string | null;
};

export type LegalPlan =
  | { state: "needs_confirmation" }
  | {
      state: "proposal";
      items: PlanRow[];
      // Members holding manage_legal: who may answer for an item.
      people: Array<{ personId: string; name: string }>;
    }
  | {
      state: "launched";
      items: PlanRow[];
      launchedAt: string;
      launchedBy: string | null;
    };

// A stored item's column, from ticket 07's states.
const COLUMN_OF: Record<string, PlanColumn> = {
  action_now: "now",
  waiting_external: "ongoing",
  blocked: "later",
  done: "later",
  obsolete: "later",
};

/** The clearances of a project, for the proposal. */
export async function listPlanClearances(
  projectId: string,
): Promise<PlanClearance[]> {
  const { data, error } = await legalClearanceRows(projectId);
  if (error) console.error("listPlanClearances:", error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    masterId: row.master_id,
    element: row.element,
    work: row.work,
    author: row.author,
    status: row.status,
  }));
}

/** The proposal computed from the confirmed dossier (also what the launch
 * action stores, rebuilt on the server). */
export async function proposeLegalPlan(
  project: {
    id: string;
    masters: Array<{ id: string; title: string; artists: string }>;
  },
  access: Access,
): Promise<PlanItem[]> {
  const [rows, clearances, completeContacts, noAgreement] = await Promise.all([
    readInventoryRows(
      project.id,
      project.masters,
      can(access, "manage_catalog"),
    ),
    listPlanClearances(project.id),
    completeFormContacts(project.id),
    noAgreementContacts(project.id),
  ]);
  return proposePlan({ rows, clearances, completeContacts, noAgreement });
}

export async function loadLegalPlan(
  project: {
    id: string;
    ownerPersonId: string | null;
    dueDate: string | null;
    masters: Array<{ id: string; title: string; artists: string }>;
  },
  access: Access,
): Promise<LegalPlan> {
  const supabase = await createClient();
  const [intake, plan, people] = await Promise.all([
    legalIntakeRow(project.id),
    legalPlanRow(project.id),
    access.organizationId
      ? listLegalPeople(access.organizationId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const names = new Map(
    (people.data ?? []).map((p) => [
      p.person_id,
      personName(p.first_name, p.last_name),
    ]),
  );

  if (plan.data?.launched_at) {
    const { data: items, error } = await supabase
      .from("legal_plan_items")
      .select(
        "item_key, kind, master_id, label, detail, why, subject, credit_ids, status, depends_on, responsible_person_id, due_on",
      )
      .eq("plan_id", plan.data.id)
      .order("created_at");
    if (error) console.error("loadLegalPlan items:", error.message);
    return {
      state: "launched",
      launchedAt: plan.data.launched_at,
      launchedBy: plan.data.launched_by
        ? (names.get(plan.data.launched_by) ?? null)
        : null,
      items: (items ?? []).map((row) => ({
        key: row.item_key,
        kind: row.kind as PlanItemKind,
        masterId: row.master_id,
        label: row.label,
        detail: row.detail,
        why: row.why ?? "",
        subject: row.subject,
        creditIds: row.credit_ids,
        status: row.status as PlanItemStatus,
        column: COLUMN_OF[row.status] ?? "later",
        dependsOn: row.depends_on,
        responsibleId: row.responsible_person_id,
        responsibleName: row.responsible_person_id
          ? (names.get(row.responsible_person_id) ?? null)
          : null,
        dueOn: row.due_on,
      })),
    };
  }
  if (intake.data?.status !== "confirmed")
    return { state: "needs_confirmation" };

  // The project's owner answers for every item until someone changes it.
  const owner =
    project.ownerPersonId && names.has(project.ownerPersonId)
      ? project.ownerPersonId
      : null;
  const proposal = await proposeLegalPlan(project, access);
  const dues = planDueDates(proposal, project.dueDate, todayInParis());
  return {
    state: "proposal",
    people: [...names].map(([personId, name]) => ({ personId, name })),
    items: proposal.map((item) => ({
      ...item,
      responsibleId: owner,
      responsibleName: owner ? (names.get(owner) ?? null) : null,
      // Proposed by kind from the release date and after what it waits
      // for, shown and changeable; an action may have none.
      dueOn: dues.get(item.key) ?? null,
    })),
  };
}
