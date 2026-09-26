import { attachAudio } from "@/lib/calls/actions";
import {
  AUDIO_BUCKET,
  MAX_AUDIO_BYTES,
  type CallErrorCode,
} from "@/lib/calls/constants";
import { createClient } from "@/lib/supabase/client";

export type UploadError = CallErrorCode | "upload_failed";

/**
 * Browser-side: uploads the audio straight to the private bucket (RLS on
 * storage.objects), then records it on the call through a server action.
 * Shared by the file picker and the in-app recorder.
 */
export async function uploadCallAudio(input: {
  callId: string;
  organizationId: string;
  body: Blob;
  ext: string;
  mime: string;
}): Promise<{ ok: true } | { ok: false; error: UploadError }> {
  if (input.body.size > MAX_AUDIO_BYTES)
    return { ok: false, error: "file_too_large" };

  const path = `${input.organizationId}/${input.callId}/${crypto.randomUUID()}.${input.ext}`;
  const { error } = await createClient()
    .storage.from(AUDIO_BUCKET)
    .upload(path, input.body, { contentType: input.mime, upsert: false });
  if (error) {
    console.error("[calls] upload failed:", error.message);
    return { ok: false, error: "upload_failed" };
  }

  const attached = await attachAudio({
    callId: input.callId,
    path,
    mime: input.mime,
    bytes: input.body.size,
  });
  return attached.ok ? { ok: true } : { ok: false, error: attached.error };
}
