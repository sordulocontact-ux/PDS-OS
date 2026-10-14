import { prepareNextCall } from "@/lib/ai/call-prep";
import { isAiQuotaExceeded } from "@/lib/ai/quota";
import { callPrepInputSchema } from "@/lib/ai/schemas/call-prep";
import { isLaboEnabled, laboError } from "@/lib/labo/guard";

export async function POST(request: Request) {
  if (!isLaboEnabled) return laboError("disabled", 404);

  const parsed = callPrepInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return laboError("invalid_input", 400);

  try {
    return Response.json({ prepared: await prepareNextCall(parsed.data) });
  } catch (error) {
    console.error("[labo] call preparation failed:", error);
    if (isAiQuotaExceeded(error)) return laboError("ai_quota", 429);
    return laboError("provider_error", 502);
  }
}
