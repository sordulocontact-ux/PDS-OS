import { extractCallReport } from "@/lib/ai/call-report";
import { isAiQuotaExceeded } from "@/lib/ai/quota";
import { transcriptSchema } from "@/lib/ai/schemas/transcript";
import { isLaboEnabled, laboError } from "@/lib/labo/guard";

// Roughly two hours of speech; beyond that, split the call.
const MAX_CHARS = 150_000;

export async function POST(request: Request) {
  if (!isLaboEnabled) return laboError("disabled", 404);

  const body: unknown = await request.json().catch(() => null);
  const parsed = transcriptSchema.safeParse(body);
  if (!parsed.success || parsed.data.text.trim().length === 0) {
    return laboError("invalid_input", 400);
  }
  if (parsed.data.text.length > MAX_CHARS) {
    return laboError("invalid_input", 413);
  }

  try {
    return Response.json(await extractCallReport(parsed.data));
  } catch (error) {
    console.error("[labo] extraction failed:", error);
    if (isAiQuotaExceeded(error)) return laboError("ai_quota", 429);
    return laboError("provider_error", 502);
  }
}
