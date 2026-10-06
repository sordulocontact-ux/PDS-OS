import { runExtraction } from "@/lib/calls/pipeline";
import { handleStep } from "@/lib/calls/route-helpers";
import { fillBriefFromCall } from "@/lib/framing/import-report";

// Structured extraction of a long transcript can take a while.
export const maxDuration = 300;

// Extraction, then the report goes straight into the Brief as proposals —
// except for an exchange of the Master (master_brief_calls): it fills the
// Brief Mix/Master instead, from its own page, never the Cadrage's.
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/calls/[callId]/extract">,
) {
  const { callId } = await params;
  return handleStep(callId, async (supabase, id) => {
    const extracted = await runExtraction(supabase, id);
    if (!extracted.ok) return extracted;
    const { data: exchange } = await supabase
      .from("master_brief_calls")
      .select("id")
      .eq("call_id", id)
      .maybeSingle();
    if (exchange) return { ok: true, briefFilled: false };
    return { ok: true, briefFilled: await fillBriefFromCall(supabase, id) };
  });
}
