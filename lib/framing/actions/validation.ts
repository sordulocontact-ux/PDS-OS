"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

// State transitions go through the database functions, which check the
// caller's membership and the allowed transition (rule 6: code owns states).

async function run(
  projectId: string,
  call: () => PromiseLike<{
    error: { code?: string; message?: string } | null;
  }>,
): Promise<ActionResult> {
  await requireApproved();
  const { error } = await call();
  if (error) return fromDatabaseError(error);
  // A validation request or decision notifies someone (database triggers).
  await schedulePendingPushes();
  // Framing and strategy pages, and the stage bar, all live under the layout.
  revalidatePath(routes.project(projectId), "layout");
  return ok;
}

export async function startStage(
  projectId: string,
  stageId: string,
): Promise<ActionResult> {
  if (!z.uuid().safeParse(stageId).success) return fail("invalid_input");
  const supabase = await createClient();
  return run(projectId, () =>
    supabase.rpc("start_stage", { p_stage_id: stageId }),
  );
}

// The validator is never chosen by the caller: in V1 there is exactly one
// holder of "validate" (the general director), resolved by the database
// (sole_validator), which refuses explicitly if the org ever has none or
// more than one instead of guessing.
export async function requestValidation(
  projectId: string,
  stageId: string,
  note: string,
): Promise<ActionResult> {
  const p = z
    .object({ stageId: z.uuid(), note: z.string().max(500) })
    .safeParse({ stageId, note });
  if (!p.success) return fail("invalid_input");
  const supabase = await createClient();
  return run(projectId, () =>
    supabase.rpc("request_validation", {
      p_stage_id: stageId,
      p_note: note,
    }),
  );
}

export async function decideValidation(
  projectId: string,
  validationId: string,
  approve: boolean,
  comment: string,
): Promise<ActionResult> {
  if (!z.uuid().safeParse(validationId).success) return fail("invalid_input");
  if (!approve && comment.trim() === "") return fail("reason_required");
  const supabase = await createClient();
  return run(projectId, () =>
    supabase.rpc("decide_validation", {
      p_validation_id: validationId,
      p_approve: approve,
      p_comment: comment,
    }),
  );
}
