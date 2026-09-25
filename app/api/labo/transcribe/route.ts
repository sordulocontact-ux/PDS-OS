import { transcribe } from "@/lib/ai/transcribe";
import { isLaboEnabled, laboError } from "@/lib/labo/guard";

// Groq rejects files above 25 MB on the free tier.
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isLaboEnabled) return laboError("disabled", 404);

  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return laboError("no_file", 400);
  }
  if (file.size > MAX_BYTES) return laboError("file_too_large", 413);
  if (!file.type.startsWith("audio/") && file.type !== "video/mp4") {
    return laboError("unsupported_type", 415);
  }

  try {
    const audio = new Uint8Array(await file.arrayBuffer());
    return Response.json(await transcribe(audio));
  } catch (error) {
    console.error("[labo] transcription failed:", error);
    return laboError("provider_error", 502);
  }
}
