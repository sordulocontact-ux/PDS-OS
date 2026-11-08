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
