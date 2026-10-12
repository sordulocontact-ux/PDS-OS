import "server-only";

import type { Member } from "@/lib/framing/related";
import {
  executionPlan,
  type ExecutionPlan,
} from "@/lib/strategy/execution-plan";
import { createClient } from "@/lib/supabase/server";

export type ExecutionRecord = {
  id: string;
  kind: "activation" | "task";
  documentVersion: number | null;
  activationId: string | null;
  taskId: string | null;
  label: string;
  createdAt: string;
};

export type StrategyReserve = {
  id: string;
  documentId: string;
  text: string;
  ownerId: string;
  ownerName: string;
  dueOn: string;
  status: "open" | "lifted";
  liftedAt: string | null;
  liftedByName: string | null;
  liftNote: string | null;
  createdByName: string;
  createdAt: string;
};

const nameOf = (members: Member[], id: string | null) =>
  (id && members.find((m) => m.personId === id)?.name) || "—";

/**
 * What a validated Brief leads to (MKT-S1-16): the plan the code proposes
 * now, and what was already created from it, each with the Brief version it
 * came from. Read with the user's session (RLS).
 */
export async function loadExecution(projectId: string): Promise<{
  plan: ExecutionPlan;
  records: ExecutionRecord[];
}> {
  const supabase = await createClient();
  const [levers, deliverables, activations, tasks, items] = await Promise.all([
    supabase
      .from("levers")
      .select("id, label, state, review_status")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("strategy_deliverables")
      .select("id, title, lever_id, assignee_person_id, due_date")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("marketing_activations")
      .select("lever_id")
      .eq("project_id", projectId)
      .not("lever_id", "is", null),
    supabase
      .from("tasks")
      .select("deliverable_id")
      .eq("project_id", projectId)
      .not("deliverable_id", "is", null),
    supabase
      .from("strategy_execution_items")
      .select(
        "id, kind, item_key, activation_id, task_id, lever_id, deliverable_id, created_at, strategy_documents(version)",
      )
      .eq("project_id", projectId)
      .order("created_at"),
  ]);
  const leverLabel = new Map((levers.data ?? []).map((l) => [l.id, l.label]));
  const deliverableTitle = new Map(
    (deliverables.data ?? []).map((d) => [d.id, d.title]),
  );
  return {
    plan: executionPlan({
      levers: levers.data ?? [],
      deliverables: deliverables.data ?? [],
      activationLeverIds: (activations.data ?? []).flatMap(
        (a) => a.lever_id ?? [],
      ),
      taskDeliverableIds: (tasks.data ?? []).flatMap(
        (t) => t.deliverable_id ?? [],
      ),
      plannedKeys: (items.data ?? []).map((i) => i.item_key),
    }),
    records: (items.data ?? []).map((i) => ({
      id: i.id,
      kind: i.kind as ExecutionRecord["kind"],
      documentVersion: i.strategy_documents?.version ?? null,
      activationId: i.activation_id,
      taskId: i.task_id,
      label:
        (i.kind === "activation"
          ? i.lever_id && leverLabel.get(i.lever_id)
          : i.deliverable_id && deliverableTitle.get(i.deliverable_id)) || "—",
      createdAt: i.created_at,
    })),
  };
}

/** The reserves of every Brief version, newest first. */
export async function loadReserves(
  projectId: string,
  members: Member[],
): Promise<StrategyReserve[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strategy_document_reserves")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) console.error("loadReserves:", error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    documentId: r.document_id,
    text: r.text,
    ownerId: r.owner_person_id,
    ownerName: nameOf(members, r.owner_person_id),
    dueOn: r.due_on,
    status: r.status as StrategyReserve["status"],
    liftedAt: r.lifted_at,
    liftedByName: r.lifted_by ? nameOf(members, r.lifted_by) : null,
    liftNote: r.lift_note,
    createdByName: nameOf(members, r.created_by),
    createdAt: r.created_at,
  }));
}

/**
 * The Brief version an activation was created from by the execution plan,
 * null when it was made another way (MKT-S1-16, the link back).
 */
export async function briefVersionOfActivation(
  activationId: string,
): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("strategy_execution_items")
    .select("strategy_documents(version)")
    .eq("activation_id", activationId)
    .maybeSingle();
  return data?.strategy_documents?.version ?? null;
}
