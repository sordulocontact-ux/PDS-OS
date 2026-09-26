import { runExtraction } from "@/lib/calls/pipeline";
import { handleStep } from "@/lib/calls/route-helpers";
import { fillBriefFromCall } from "@/lib/framing/import-report";

// Structured extraction of a long transcript can take a while.
export const maxDuration = 300;

// Extraction, then the report goes straight into the Brief as proposals.
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/calls/[callId]/extract">,
) {
  const { callId } = await params;
  return handleStep(callId, async (supabase, id) => {
    const extracted = await runExtraction(supabase, id);
    if (!extracted.ok) return extracted;
    return { ok: true, briefFilled: await fillBriefFromCall(supabase, id) };
  });
}
