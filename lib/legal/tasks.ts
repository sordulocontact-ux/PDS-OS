import "server-only";

import { legalActionHref, isPlanItemKind } from "@/lib/legal/plan/where";
import type { createClient } from "@/lib/supabase/server";

// What the Travail needs to know of a task that came from the Juridique's
// plan: where it is done, and whether it still waits for another action
// (« En attente de : … », computed by code from the tasks of the actions it
// depends on). Read with the viewer's session: someone without manage_legal
// reads no plan and gets nothing here (the task stays a plain task).

export type LegalTaskInfo = { href: string; waitingOn: string | null };

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function legalTaskInfo(
  supabase: Supabase,
  tasks: Array<{ id: string; legal_plan_item_id: string | null }>,
): Promise<Map<string, LegalTaskInfo>> {
  const itemIds = tasks.flatMap((t) =>
    t.legal_plan_item_id ? [t.legal_plan_item_id] : [],
  );
  const info = new Map<string, LegalTaskInfo>();
  if (itemIds.length === 0) return info;

  const { data: items, error } = await supabase
    .from("legal_plan_items")
    .select("id, plan_id, project_id, kind, master_id, depends_on")
    .in("id", itemIds);
  if (error) console.error("legalTaskInfo:", error.message);
  if (!items?.length) return info;

  // The actions they wait for, and their tasks.
  const planIds = [...new Set(items.map((i) => i.plan_id))];
  const depKeys = [...new Set(items.flatMap((i) => i.depends_on))];
  const deps =
    depKeys.length > 0
      ? await supabase
          .from("legal_plan_items")
          .select("id, plan_id, item_key, label")
          .in("plan_id", planIds)
          .in("item_key", depKeys)
      : { data: [], error: null };
  const depIds = (deps.data ?? []).map((d) => d.id);
  const depTasks =
    depIds.length > 0
      ? await supabase
          .from("tasks")
          .select("legal_plan_item_id, status")
          .in("legal_plan_item_id", depIds)
      : { data: [], error: null };
  const openDeps = new Set(
    (depTasks.data ?? []).flatMap((t) =>
      t.status === "todo" && t.legal_plan_item_id ? [t.legal_plan_item_id] : [],
    ),
  );

  const itemOf = new Map(items.map((i) => [i.id, i]));
  for (const task of tasks) {
    const item = task.legal_plan_item_id
      ? itemOf.get(task.legal_plan_item_id)
      : undefined;
    if (!item || !isPlanItemKind(item.kind)) continue;
    const waiting = (deps.data ?? []).filter(
      (d) =>
        d.plan_id === item.plan_id &&
        item.depends_on.includes(d.item_key) &&
        openDeps.has(d.id),
    );
    info.set(task.id, {
      href: legalActionHref(item.project_id, item.kind),
      waitingOn:
        waiting.length > 0 ? waiting.map((d) => d.label).join(", ") : null,
    });
  }
  return info;
}
