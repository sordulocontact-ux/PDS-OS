"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";
import { TASK_PAGES } from "@/lib/work/task-pages";

type Result = { ok: true } | { ok: false };

// The project and the page of it the task opens (retour du 09/11/2026); a
// page without a project is dropped.
const linkInput = {
  projectId: z.uuid().nullable().default(null),
  page: z.enum(TASK_PAGES).nullable().default(null),
};

const addInput = z.object({
  title: z.string().trim().min(1).max(300),
  dueDate: z.iso.date().nullable(),
  important: z.boolean().default(false),
  urgent: z.boolean().default(false),
  ...linkInput,
});

/** A task the person writes for themselves (« Mes tâches »). */
export async function addPersonalTask(
  input: z.input<typeof addInput>,
): Promise<Result> {
  const p = addInput.safeParse(input);
  const access = await requireApproved();
  if (!p.success || !access.organizationId) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("personal_tasks").insert({
    organization_id: access.organizationId,
    title: p.data.title,
    due_date: p.data.dueDate,
    important: p.data.important,
    urgent: p.data.urgent,
    project_id: p.data.projectId,
    project_page: p.data.projectId ? p.data.page : null,
  });
  if (error) console.error("addPersonalTask:", error.message);
  revalidatePath(routes.work);
  return error ? { ok: false } : { ok: true };
}

/** Ticked, or back to do. */
export async function setPersonalTaskDone(
  taskId: string,
  isDone: boolean,
): Promise<Result> {
  if (!z.uuid().safeParse(taskId).success) return { ok: false };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("personal_tasks")
    .update({
      status: isDone ? "done" : "todo",
      done_at: isDone ? new Date().toISOString() : null,
    })
    .eq("id", taskId);
  if (error) console.error("setPersonalTaskDone:", error.message);
  revalidatePath(routes.work);
  return error ? { ok: false } : { ok: true };
}

const boxInput = z.object({
  important: z.boolean(),
  urgent: z.boolean(),
});

/** Moved to another box of the matrix: what the person says of it. */
export async function setPersonalTaskBox(
  taskId: string,
  box: z.input<typeof boxInput>,
): Promise<Result> {
  const p = boxInput.safeParse(box);
  if (!p.success || !z.uuid().safeParse(taskId).success) return { ok: false };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("personal_tasks")
    .update({ important: p.data.important, urgent: p.data.urgent })
    .eq("id", taskId);
  if (error) console.error("setPersonalTaskBox:", error.message);
  revalidatePath(routes.work);
  return error ? { ok: false } : { ok: true };
}

const editInput = z.object({
  title: z.string().trim().min(1).max(300),
  dueDate: z.iso.date().nullable(),
  important: z.boolean(),
  ...linkInput,
});

/** Its wording, its date, its importance and where it leads, changed by its
 * owner. */
export async function updatePersonalTask(
  taskId: string,
  input: z.input<typeof editInput>,
): Promise<Result> {
  const p = editInput.safeParse(input);
  if (!p.success || !z.uuid().safeParse(taskId).success) return { ok: false };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("personal_tasks")
    .update({
      title: p.data.title,
      due_date: p.data.dueDate,
      important: p.data.important,
      project_id: p.data.projectId,
      project_page: p.data.projectId ? p.data.page : null,
    })
    .eq("id", taskId);
  if (error) console.error("updatePersonalTask:", error.message);
  revalidatePath(routes.work);
  return error ? { ok: false } : { ok: true };
}

/**
 * Gone from « Mes tâches »: nothing builds on a personal task. One that came
 * from a meeting stays as a 'dismissed' row (never listed): without it, the
 * meeting would put it back at the next read (addMyMeetingTasks).
 */
export async function deletePersonalTask(taskId: string): Promise<Result> {
  if (!z.uuid().safeParse(taskId).success) return { ok: false };
  await requireApproved();
  const supabase = await createClient();
  const { data: dismissed, error: dismissError } = await supabase
    .from("personal_tasks")
    .update({ status: "dismissed", done_at: null })
    .eq("id", taskId)
    .or("source_call_id.not.is.null,source_report_item_id.not.is.null")
    .select("id");
  if (dismissError) console.error("deletePersonalTask:", dismissError.message);
  if (dismissed && dismissed.length > 0) {
    revalidatePath(routes.work);
    return { ok: true };
  }
  // Written by the person, or its meeting no longer seen: deleted.
  const { error } = await supabase
    .from("personal_tasks")
    .delete()
    .eq("id", taskId);
  if (error) console.error("deletePersonalTask:", error.message);
  revalidatePath(routes.work);
  return error ? { ok: false } : { ok: true };
}
