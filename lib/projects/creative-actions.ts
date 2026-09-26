"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

// The SQL functions decide who may change the creative team (the director,
// or the project's owner) and who may join it (creative directors only).

const input = z.object({ projectId: z.uuid(), personId: z.uuid() });

export async function addProjectCreative(
  projectId: string,
  personId: string,
): Promise<boolean> {
  await requireApproved();
  const parsed = input.safeParse({ projectId, personId });
  if (!parsed.success) return false;
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_project_creative", {
    p_project_id: parsed.data.projectId,
    p_person_id: parsed.data.personId,
  });
  if (error) {
    console.error("addProjectCreative:", error.message);
    return false;
  }
  // The creative director is notified by a database trigger.
  await schedulePendingPushes();
  revalidatePath(routes.project(projectId), "layout");
  return true;
}

export async function removeProjectCreative(
  projectId: string,
  personId: string,
): Promise<boolean> {
  await requireApproved();
  const parsed = input.safeParse({ projectId, personId });
  if (!parsed.success) return false;
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_project_creative", {
    p_project_id: parsed.data.projectId,
    p_person_id: parsed.data.personId,
  });
  if (error) {
    console.error("removeProjectCreative:", error.message);
    return false;
  }
  revalidatePath(routes.project(projectId), "layout");
  return true;
}
