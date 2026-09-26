import "server-only";

import { getAccess } from "@/lib/auth/dal";
import type { ActionResult, CallErrorCode } from "@/lib/calls/constants";
import { createClient } from "@/lib/supabase/server";

const HTTP_STATUS: Partial<Record<CallErrorCode, number>> = {
  unauthorized: 401,
  not_found: 404,
  busy: 409,
  no_transcript: 409,
  audio_missing: 409,
  audio_too_large: 413,
  provider_quota: 429,
  provider_error: 502,
  audio_unavailable: 502,
};

type Step = (
  supabase: Awaited<ReturnType<typeof createClient>>,
  callId: string,
) => Promise<ActionResult>;

/** Runs a pipeline step for an approved session and answers in JSON. */
export async function handleStep(callId: string, step: Step) {
  const access = await getAccess();
  if (access.state !== "approved") {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const result = await step(await createClient(), callId);
  const status = result.ok ? 200 : (HTTP_STATUS[result.error] ?? 500);
  return Response.json(result, { status });
}
