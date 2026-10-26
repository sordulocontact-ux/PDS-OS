import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { todayInParis } from "@/lib/contracts/types";
import { completeFormContacts } from "@/lib/legal/forms/queries";
import { readInventoryRows } from "@/lib/legal/inventory-rows";
import { splitStates } from "@/lib/legal/splits/queries";
import {
  proposePlan,
  type PlanItemKind,
  type PlanItemStatus,
} from "@/lib/legal/plan/proposal";
import { trackPlan, type TrackedItem } from "@/lib/legal/tracking/state";
import { personName } from "@/lib/projects/types";
import { listLegalPeople } from "@/lib/legal/legal-people";
import { createClient } from "@/lib/supabase/server";
import { argsKey, memoPerRequest } from "@/lib/utils/request-memo";

export type LegalTracking =
  | { state: "not_launched" }
  | {
      state: "tracking";
      items: TrackedItem[];
      // Actions the dossier asks for now that the plan does not hold
      // (a person or a title added since the launch): « Ajouter au plan ».
      added: number;
      // Who may answer for an action (delegation).
      people: Array<{ personId: string; name: string }>;
    };

/** The Suivi of a launched plan, read with the viewer's session: the stored
 * actions, then their sources (Réseau, Contrats, titles, clearances). */
async function readTracking(
  project: {
    id: string;
    masters: Array<{ id: string; title: string; artists: string }>;
  },
  access: Access,
): Promise<LegalTracking> {
  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from("legal_plans")
    .select("id, launched_at, dismissed_keys")
    .eq("project_id", project.id)
    .maybeSingle();
  if (error) console.error("loadTracking plan:", error.message);
  if (!plan?.launched_at) return { state: "not_launched" };

  const [items, rows, clearances, people, completeContacts, splitOf] =
    await Promise.all([
      supabase
        .from("legal_plan_items")
        .select(
          "id, item_key, kind, master_id, label, detail, why, subject, credit_ids, status, depends_on, responsible_person_id, due_on",
        )
        .eq("plan_id", plan.id)
        .order("created_at"),
      readInventoryRows(
        project.id,
        project.masters,
        can(access, "manage_catalog"),
      ),
      supabase
        .from("legal_clearances")
        .select("id, master_id, element, work, author, status, updated_at")
        .eq("project_id", project.id),
      access.organizationId
        ? listLegalPeople(access.organizationId)
        : Promise.resolve({ data: [], error: null }),
      completeFormContacts(project.id),
      splitStates(project.id),
    ]);
  if (items.error) console.error("loadTracking items:", items.error.message);
  // The borrowings whose conditions wait for the direction.
  const clearanceIds = (clearances.data ?? []).map((c) => c.id);
  const { data: pendingTerms } = clearanceIds.length
    ? await supabase
        .from("legal_clearance_terms")
        .select("clearance_id")
        .eq("status", "proposed")
        .in("clearance_id", clearanceIds)
    : { data: [] };
  const termsPending = new Set(
    (pendingTerms ?? []).map((row) => row.clearance_id),
  );
  // Removed at the launch or retired since: not « apparu depuis ».
  const planKeys = new Set([
    ...(items.data ?? []).map((row) => row.item_key),
    ...plan.dismissed_keys,
  ]);
  const added = proposePlan({
    rows,
    completeContacts,
    clearances: (clearances.data ?? []).map((c) => ({
      id: c.id,
      masterId: c.master_id,
      element: c.element,
      work: c.work,
      author: c.author,
      status: c.status,
    })),
  }).filter((item) => !planKeys.has(item.key)).length;
  const names = new Map(
    (people.data ?? []).map((p) => [
      p.person_id,
      personName(p.first_name, p.last_name),
    ]),
  );

  return {
    state: "tracking",
    added,
    people: [...names].map(([personId, name]) => ({ personId, name })),
    items: trackPlan({
      projectId: project.id,
      today: todayInParis(new Date()),
      completeContacts,
      splitOf,
      rows,
      clearances: (clearances.data ?? []).map((c) => ({
        id: c.id,
        status: c.status,
        updatedAt: c.updated_at,
        termsPending: termsPending.has(c.id),
      })),
      // Retired actions (an agreement no longer needed) leave the Suivi;
      // what waited for them is free.
      items: (items.data ?? [])
        .filter((row) => !plan.dismissed_keys.includes(row.item_key))
        .map((row) => ({
          id: row.id,
          key: row.item_key,
          kind: row.kind as PlanItemKind,
          masterId: row.master_id,
          label: row.label,
          detail: row.detail,
          why: row.why ?? "",
          subject: row.subject,
          creditIds: row.credit_ids,
          status: row.status as PlanItemStatus,
          // The plan's column at launch; the Suivi regroups by current state.
          column: "now",
          dependsOn: row.depends_on,
          responsibleId: row.responsible_person_id,
          responsibleName: row.responsible_person_id
            ? (names.get(row.responsible_person_id) ?? null)
            : null,
          dueOn: row.due_on,
        })),
    }),
  };
}

// Once per request for the same project and viewer (the workflow statuses and
// the Juridique's journey both read it, page loads audit).
export const loadTracking = memoPerRequest(argsKey, readTracking);
