import "server-only";

import { getAccess } from "@/lib/auth/dal";
import type { ActionResult, CallErrorCode } from "@/lib/calls/constants";
import { createClient } from "@/lib/supabase/server";

const HTTP_STATUS: Partial<Record<CallErrorCode, number>> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  busy: 409,
  no_transcript: 409,
  audio_missing: 409,
  audio_too_large: 413,
  provider_quota: 429,
  provider_error: 502,
  audio_unavailable: 502,
};

// A step may add facts to its success (the extraction says if the Brief or
// the Stratégie or the Conception was filled).
type Step = (
  supabase: Awaited<ReturnType<typeof createClient>>,
  callId: string,
) => Promise<
  ActionResult & {
    briefFilled?: boolean;
    strategyFilled?: boolean;
    designFilled?: boolean;
    productionDeliverableId?: string;
  }
>;

/** Runs a pipeline step for an approved session and answers in JSON. */
export async function handleStep(callId: string, step: Step) {
  const access = await getAccess();
  if (access.state !== "approved") {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const supabase = await createClient();
  // Refused before any paid provider call: only the project's owner works on
  // its calls (the database would refuse the write anyway).
  const { data: isOwner } = await supabase.rpc("is_call_owner", {
    p_call_id: callId,
  });
  if (!isOwner) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const result = await step(supabase, callId);
  const status = result.ok ? 200 : (HTTP_STATUS[result.error] ?? 500);
  return Response.json(result, { status });
}
