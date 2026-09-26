import { transcribeDictation } from "@/lib/voice/engine";
import { readDictation, replyError } from "@/lib/voice/http";

// Transcription of a two-minute dictation: a few seconds.
export const maxDuration = 60;

/**
 * Speech to text alone, for a question to the assistant: multipart `audio`,
 * answers `{ ok, text }`. The text goes back into the input, where the user
 * reads it before sending. The audio is not kept.
 */
export async function POST(request: Request) {
  const body = await readDictation(request);
  if ("error" in body) return replyError(body.error);

  const result = await transcribeDictation(body.audio);
  return result.ok
    ? Response.json({ ok: true, text: result.heard })
    : replyError(result.error);
}
