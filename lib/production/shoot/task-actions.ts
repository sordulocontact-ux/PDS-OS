"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { invalidInput, shootFailure } from "@/lib/production/shoot/result";
import { createClient } from "@/lib/supabase/server";

const taskSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1).max(300),
  assigneePersonId: z.uuid(),
  dueDate: z.iso.date(),
});

/** « Créer la tâche » from a follow-up PO proposed: only after the person
 * chose who and when (ticket: « leur création demande confirmation »). The
 * assignee is notified by the tasks' trigger (the alert), the push after. */
export async function createShootTask(
  input: z.input<typeof taskSchema>,
): Promise<PrepResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return invalidInput;
  const d = parsed.data;
  const access = await requireApproved();
  if (!access.organizationId) return shootFailure({ code: "42501" });
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    organization_id: access.organizationId,
    project_id: d.projectId,
    title: d.title,
    assignee_person_id: d.assigneePersonId,
    due_date: d.dueDate,
  });
  if (error) return shootFailure(error);
  await schedulePendingPushes();
  return prepDone(d.projectId);
}
