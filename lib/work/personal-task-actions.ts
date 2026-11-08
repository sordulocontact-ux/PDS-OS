"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false };

const addInput = z.object({
  title: z.string().trim().min(1).max(300),
  dueDate: z.iso.date().nullable(),
  important: z.boolean().default(false),
  urgent: z.boolean().default(false),
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
});

/** Its wording, its date and its importance, changed by its owner. */
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
    })
    .eq("id", taskId);
  if (error) console.error("updatePersonalTask:", error.message);
  revalidatePath(routes.work);
  return error ? { ok: false } : { ok: true };
}

/** Gone for good: nothing builds on a personal task. */
export async function deletePersonalTask(taskId: string): Promise<Result> {
  if (!z.uuid().safeParse(taskId).success) return { ok: false };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("personal_tasks")
    .delete()
    .eq("id", taskId);
  if (error) console.error("deletePersonalTask:", error.message);
  revalidatePath(routes.work);
  return error ? { ok: false } : { ok: true };
}

/**
 * A meeting's suggestion answered: added as a task (its words, no date, not
 * important: the person sorts it after) or set aside. Either way a row, so
 * it is not suggested again. The item is read with the person's session:
 * one of a call they do not see is refused.
 */
async function answerSuggestion(
  itemId: string,
  status: "todo" | "dismissed",
): Promise<Result> {
  if (!z.uuid().safeParse(itemId).success) return { ok: false };
  const access = await requireApproved();
  if (!access.organizationId) return { ok: false };
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("report_items")
    .select(
      "id, kind, what, report:call_reports!report_items_report_same_org(call_id)",
    )
    .eq("id", itemId)
    .maybeSingle();
  if (!item || item.kind !== "next_action" || !item.report)
    return { ok: false };
  const { error } = await supabase.from("personal_tasks").insert({
    organization_id: access.organizationId,
    title: item.what.trim().slice(0, 300),
    status,
    source_call_id: item.report.call_id,
    source_report_item_id: item.id,
  });
  // Answered already (a double click, another tab): nothing more to do.
  if (error && error.code !== "23505")
    console.error("answerSuggestion:", error.message);
  revalidatePath(routes.work);
  return error && error.code !== "23505" ? { ok: false } : { ok: true };
}

export async function acceptCallSuggestion(itemId: string): Promise<Result> {
  return answerSuggestion(itemId, "todo");
}

export async function dismissCallSuggestion(itemId: string): Promise<Result> {
  return answerSuggestion(itemId, "dismissed");
}
