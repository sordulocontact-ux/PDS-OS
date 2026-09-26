import { z } from "zod";

import { getAccess } from "@/lib/auth/dal";
import { dictateFor } from "@/lib/voice/adapters";
import {
  isVoiceStage,
  MAX_DICTATION_BYTES,
  type VoiceErrorCode,
} from "@/lib/voice/constants";

// Transcription and extraction of a two-minute dictation: well under a minute.
export const maxDuration = 60;

const HTTP_STATUS: Record<VoiceErrorCode, number> = {
  unauthorized: 401,
  invalid_input: 400,
  not_found: 404,
  audio_too_large: 413,
  nothing_heard: 422,
  nothing_understood: 422,
  provider_quota: 429,
  provider_error: 502,
};

const reply = (error: VoiceErrorCode) =>
  Response.json({ ok: false, error }, { status: HTTP_STATUS[error] });

/**
 * Dictation of a stage form: multipart `projectId` + `audio`. Answers the
 * heard text and the proposals; writes nothing. The audio is not kept.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/voice/[stage]">,
) {
  const access = await getAccess();
  if (access.state !== "approved") return reply("unauthorized");

  const { stage } = await params;
  if (!isVoiceStage(stage)) return reply("not_found");

  const form = await request.formData().catch(() => null);
  const projectId = z.uuid().safeParse(form?.get("projectId"));
  const audio = form?.get("audio");
  if (!projectId.success || !(audio instanceof File) || audio.size === 0)
    return reply("invalid_input");
  if (audio.size > MAX_DICTATION_BYTES) return reply("audio_too_large");

  const bytes = new Uint8Array(await audio.arrayBuffer());
  const result = await dictateFor(stage, projectId.data, bytes);
  return result.ok ? Response.json(result) : reply(result.error);
}
