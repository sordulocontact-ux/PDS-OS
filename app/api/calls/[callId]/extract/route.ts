import { getAccess } from "@/lib/auth/dal";
import { runExtraction } from "@/lib/calls/pipeline";
import { handleStep } from "@/lib/calls/route-helpers";
import { analyseFramingCall } from "@/lib/framing/call-analysis";
import { fillBriefFromCall } from "@/lib/framing/import-report";
import { fillStrategyFromCall } from "@/lib/strategy/import-call";

// Structured extraction of a long transcript can take a while.
export const maxDuration = 300;

// Extraction, then the report goes straight into the Cadrage as proposals —
// except for an exchange of the Master (master_brief_calls): it fills the
// Brief Mix/Master instead, from its own page, never the Cadrage's; a
// strategy exchange (strategy_calls) fills the Strategy. PO also
// reads the call for the six dimensions of the Cadrage intelligent
// (lib/framing/call-analysis.ts); the report itself stays in Calls.
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
    // A strategy exchange fills the Strategy (proposals), not the Cadrage.
    const { data: strategyCall } = await supabase
      .from("strategy_calls")
      .select("call_id")
      .eq("call_id", id)
      .maybeSingle();
    if (strategyCall) {
      const strategyFilled = await fillStrategyFromCall(supabase, id);
      return { ok: true, briefFilled: false, strategyFilled };
    }
    const filled = await fillBriefFromCall(supabase, id);
    const access = await getAccess();
    const analysed =
      access.state === "approved"
        ? await analyseFramingCall(supabase, access, id)
        : false;
    return { ok: true, briefFilled: filled || analysed };
  });
}
