"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fail, fromDatabaseError } from "@/lib/framing/result";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The answers to the validator's requests (PROJ-UX-06): the owner marks one
// corrected (the database checks that the latest version changed it) or
// justifies it; the validator withdraws one with a reason. Nothing else is
// written: the request stays, with who, when and why.

const input = z.object({
  projectId: z.uuid(),
  requestId: z.uuid(),
  text: z.string().trim().max(2000),
});

const failure = (code: Parameters<typeof fail>[0]): WriteResult => ({
  ok: false,
  error: fr.framing.errors[code],
});

async function done(
  projectId: string,
  error: { code?: string; message?: string } | null,
): Promise<WriteResult> {
  if (error) {
    const result = fromDatabaseError(error);
    return failure(result.ok ? "generic" : result.error);
  }
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}

export async function resolveBriefRequest(
  projectId: string,
  requestId: string,
  note: string,
): Promise<WriteResult> {
  const p = input.safeParse({ projectId, requestId, text: note });
  if (!p.success) return failure("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_framing_brief_request", {
    p_request_id: p.data.requestId,
    p_note: p.data.text,
  });
  return done(p.data.projectId, error);
}

export async function withdrawBriefRequest(
  projectId: string,
  requestId: string,
  reason: string,
): Promise<WriteResult> {
  const p = input.safeParse({ projectId, requestId, text: reason });
  if (!p.success) return failure("invalid_input");
  if (!p.data.text) return failure("reason_required");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_framing_brief_request", {
    p_request_id: p.data.requestId,
    p_reason: p.data.text,
  });
  return done(p.data.projectId, error);
}
