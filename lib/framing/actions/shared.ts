import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fromDatabaseError, ok, type ActionResult } from "@/lib/framing/result";

/** Helpers shared by the framing work actions. */
export const FAMILIES = [
  "creation_content",
  "promotion_distribution",
  "experiences_activations",
  "other",
] as const;
export const REVIEW = ["confirmed", "rejected"] as const;
export const id = z.uuid();
export const text = (max: number) => z.string().trim().min(1).max(max);

export async function done(
  projectId: string,
  error: { code?: string; message?: string } | null,
): Promise<ActionResult> {
  if (error) return fromDatabaseError(error);
  revalidatePath(routes.projectFraming(projectId));
  return ok;
}

export async function orgId(): Promise<string | null> {
  return (await requireApproved()).organizationId;
}
