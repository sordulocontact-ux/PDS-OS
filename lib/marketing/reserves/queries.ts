import "server-only";

import type { Access } from "@/lib/auth/access";
import { loadMembers } from "@/lib/framing/related";
import {
  isReserveDecision,
  isReserveStatus,
  type ReserveDecision,
  type ReserveStatus,
} from "@/lib/marketing/closure/reserves";
import type { ReserveFact } from "@/lib/marketing/dashboard";
import {
  isReserveCategory,
  type ReserveCategory,
} from "@/lib/marketing/reports/model";
import { createClient } from "@/lib/supabase/server";

export type Reserve = {
  id: string;
  category: ReserveCategory;
  description: string;
  origin: string;
  originReportId: string | null;
  activationId: string | null;
  status: ReserveStatus;
  decision: ReserveDecision | null;
  reason: string | null;
  followUp: {
    personId: string | null;
    name: string | null;
    dueOn: string | null;
    channel: string | null;
    note: string | null;
  };
  duplicateOf: string | null;
  task: { id: string; title: string; done: boolean } | null;
  arbitrated: { at: string; by: string | null } | null;
  lifted: { at: string; by: string | null; note: string | null } | null;
  createdAt: string;
};

const COLUMNS =
  "id, category, description, origin, origin_report_id, activation_id, status, decision, decision_reason, follow_up_person_id, follow_up_due_on, follow_up_channel, follow_up_note, duplicate_of, task_id, arbitrated_by, arbitrated_at, lifted_by, lifted_at, lift_note, created_at, task:tasks(id, title, status)";

/** The project's reserves, oldest first, with who arbitrated, follows and
 * lifted each (RLS decides). */
export async function loadReserves(
  projectId: string,
  access: Access,
): Promise<Reserve[]> {
  const supabase = await createClient();
  const [{ data, error }, members] = await Promise.all([
    supabase
      .from("marketing_reserves")
      .select(COLUMNS)
      .eq("project_id", projectId)
      .order("created_at")
      // A report creates its reserves in one go: a stable order.
      .order("id"),
    loadMembers(access),
  ]);
  if (error) console.error("loadReserves:", error.message);
  const nameOf = (id: string | null) =>
    id ? (members.find((m) => m.personId === id)?.name ?? null) : null;
  return (data ?? []).flatMap((r) =>
    isReserveCategory(r.category) && isReserveStatus(r.status)
      ? [
          {
            id: r.id,
            category: r.category,
            description: r.description,
            origin: r.origin,
            originReportId: r.origin_report_id,
            activationId: r.activation_id,
            status: r.status,
            decision: isReserveDecision(r.decision) ? r.decision : null,
            reason: r.decision_reason,
            followUp: {
              personId: r.follow_up_person_id,
              name: nameOf(r.follow_up_person_id),
              dueOn: r.follow_up_due_on,
              channel: r.follow_up_channel,
              note: r.follow_up_note,
            },
            duplicateOf: r.duplicate_of,
            task: r.task
              ? {
                  id: r.task.id,
                  title: r.task.title,
                  done: r.task.status === "done",
                }
              : null,
            arbitrated: r.arbitrated_at
              ? { at: r.arbitrated_at, by: nameOf(r.arbitrated_by) }
              : null,
            lifted: r.lifted_at
              ? { at: r.lifted_at, by: nameOf(r.lifted_by), note: r.lift_note }
              : null,
            createdAt: r.created_at,
          },
        ]
      : [],
  );
}

/** The reserves as the dashboard counts them; a follow-up still running
 * once the Marketing is closed is « suivie après clôture ». */
export function reserveFacts(
  reserves: Reserve[],
  marketingClosed: boolean,
): ReserveFact[] {
  return reserves.map((r) => ({
    id: r.id,
    activationId: r.activationId,
    state:
      r.status === "open"
        ? "open"
        : r.status === "arbitrated"
          ? marketingClosed && r.decision === "follow_up"
            ? "followed"
            : "arbitrated"
          : "lifted",
  }));
}

/** The project's tasks a follow-up can be linked to (those not done). */
export async function loadReserveTaskOptions(
  projectId: string,
): Promise<{ id: string; title: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, status")
    .eq("project_id", projectId)
    .neq("status", "done")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((task) => ({ id: task.id, title: task.title }));
}
