import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { todayInParis } from "@/lib/contracts/types";
import { completeFormContacts } from "@/lib/legal/forms/queries";
import { readInventoryRows } from "@/lib/legal/inventory-rows";
import type { PlanItemKind, PlanItemStatus } from "@/lib/legal/plan/proposal";
import { trackPlan, type TrackedItem } from "@/lib/legal/tracking/state";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

export type LegalTracking =
  | { state: "not_launched" }
  | {
      state: "tracking";
      items: TrackedItem[];
      // Who may answer for an action (delegation).
      people: Array<{ personId: string; name: string }>;
    };

/** The Suivi of a launched plan, read with the viewer's session: the stored
 * actions, then their sources (Réseau, Contrats, titles, clearances). */
export async function loadTracking(
  project: {
    id: string;
    masters: Array<{ id: string; title: string; artists: string }>;
  },
  access: Access,
): Promise<LegalTracking> {
  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from("legal_plans")
    .select("id, launched_at")
    .eq("project_id", project.id)
    .maybeSingle();
  if (error) console.error("loadTracking plan:", error.message);
  if (!plan?.launched_at) return { state: "not_launched" };

  const [items, rows, clearances, people, completeContacts] = await Promise.all(
    [
      supabase
        .from("legal_plan_items")
        .select(
          "id, item_key, kind, master_id, label, detail, why, status, depends_on, responsible_person_id, due_on",
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
        .select("id, status, updated_at")
        .eq("project_id", project.id),
      access.organizationId
        ? supabase.rpc("list_legal_people", {
            p_organization_id: access.organizationId,
          })
        : Promise.resolve({ data: [], error: null }),
      completeFormContacts(project.id),
    ],
  );
  if (items.error) console.error("loadTracking items:", items.error.message);
  // The tasks these actions became (RLS: the project's visible tasks).
  const itemIds = (items.data ?? []).map((row) => row.id);
  const tasks =
    itemIds.length > 0
      ? await supabase
          .from("tasks")
          .select("id, status, legal_plan_item_id")
          .in("legal_plan_item_id", itemIds)
      : { data: [], error: null };
  if (tasks.error) console.error("loadTracking tasks:", tasks.error.message);
  const taskOf = new Map(
    (tasks.data ?? []).flatMap((task) =>
      task.legal_plan_item_id
        ? [
            [
              task.legal_plan_item_id,
              { id: task.id, done: task.status === "done" },
            ] as const,
          ]
        : [],
    ),
  );
  const names = new Map(
    (people.data ?? []).map((p) => [
      p.person_id,
      personName(p.first_name, p.last_name),
    ]),
  );

  return {
    state: "tracking",
    people: [...names].map(([personId, name]) => ({ personId, name })),
    items: trackPlan({
      projectId: project.id,
      today: todayInParis(new Date()),
      completeContacts,
      rows,
      clearances: (clearances.data ?? []).map((c) => ({
        id: c.id,
        status: c.status,
        updatedAt: c.updated_at,
      })),
      items: (items.data ?? []).map((row) => ({
        id: row.id,
        task: taskOf.get(row.id) ?? null,
        key: row.item_key,
        kind: row.kind as PlanItemKind,
        masterId: row.master_id,
        label: row.label,
        detail: row.detail,
        why: row.why ?? "",
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
