import "server-only";

import { getAccess } from "@/lib/auth/dal";
import {
  MAX_DICTATION_BYTES,
  type VoiceErrorCode,
} from "@/lib/voice/constants";

/** Request plumbing shared by the dictation routes. */

const HTTP_STATUS: Record<VoiceErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  invalid_input: 400,
  not_found: 404,
  audio_too_large: 413,
  nothing_heard: 422,
  nothing_understood: 422,
  provider_quota: 429,
  ai_quota: 429,
  provider_error: 502,
};

export const replyError = (error: VoiceErrorCode) =>
  Response.json({ ok: false, error }, { status: HTTP_STATUS[error] });

/** An approved session and a multipart body holding a bounded `audio` file. */
export async function readDictation(
  request: Request,
): Promise<{ form: FormData; audio: Uint8Array } | { error: VoiceErrorCode }> {
  const access = await getAccess();
  if (access.state !== "approved") return { error: "unauthorized" };

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!form || !(audio instanceof File) || audio.size === 0)
    return { error: "invalid_input" };
  if (audio.size > MAX_DICTATION_BYTES) return { error: "audio_too_large" };
  return { form, audio: new Uint8Array(await audio.arrayBuffer()) };
}
