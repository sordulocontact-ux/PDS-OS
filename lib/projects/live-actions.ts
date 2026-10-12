"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";

/**
 * A change was signalled on the project (project_live, JUR-12 / JUR-28):
 * every page of the project is read again, the open one at once, the others
 * at their next visit — never a stale page restored by the client cache.
 * Reads nothing itself: each page reads with the person's session (RLS).
 */
export async function refreshProjectData(projectId: string): Promise<void> {
  await requireApproved();
  if (!z.uuid().safeParse(projectId).success) return;
  revalidatePath(routes.project(projectId), "layout");
}
