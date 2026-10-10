"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { done, id, orgId, text } from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

// Open points and tasks -----------------------------------------------------

export async function resolveOpenPoint(
  projectId: string,
  pointId: string,
  resolution: string,
): Promise<ActionResult> {
  const p = text(1000).safeParse(resolution);
  if (!p.success || !id.safeParse(pointId).success)
    return fail("reason_required");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("open_points")
    .update({
      status: "resolved",
      resolution: p.data,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", pointId)
    .eq("project_id", projectId);
  return done(projectId, error);
}

export async function addOpenPoint(
  projectId: string,
  question: string,
): Promise<ActionResult> {
  const p = text(500).safeParse(question);
  const organizationId = await orgId();
  if (!p.success || !organizationId || !id.safeParse(projectId).success)
    return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("open_points").insert({
    organization_id: organizationId,
    project_id: projectId,
    question: p.data,
  });
  return done(projectId, error);
}

const taskInput = z.object({
  title: text(300),
  assigneePersonId: id,
  dueDate: z.iso.date(),
  sourceReportItemId: id.nullable(),
  // The deliverable the task is about (same project, checked in SQL).
  deliverableId: id.nullable().default(null),
});

/** A task always gets an owner and a due date, chosen by a person — never by PO. */
export async function createTask(
  projectId: string,
  task: z.input<typeof taskInput>,
): Promise<ActionResult> {
  const p = taskInput.safeParse(task);
  const organizationId = await orgId();
  if (!p.success || !organizationId || !id.safeParse(projectId).success)
    return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    organization_id: organizationId,
    project_id: projectId,
    title: p.data.title,
    assignee_person_id: p.data.assigneePersonId,
    due_date: p.data.dueDate,
    source_report_item_id: p.data.sourceReportItemId,
    deliverable_id: p.data.deliverableId,
  });
  // The assignee is notified by a database trigger; the push leaves after.
  if (!error) await schedulePendingPushes();
  return done(projectId, error);
}

export async function setTaskDone(
  projectId: string,
  taskId: string,
  isDone: boolean,
): Promise<ActionResult> {
  if (!id.safeParse(taskId).success) return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: isDone ? "done" : "todo",
      done_at: isDone ? new Date().toISOString() : null,
    })
    .eq("id", taskId)
    .eq("project_id", projectId);
  return done(projectId, error);
}
