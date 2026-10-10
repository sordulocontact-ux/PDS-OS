import { getAccess } from "@/lib/auth/dal";
import { runExtraction } from "@/lib/calls/pipeline";
import { fillDesignFromCall } from "@/lib/design/import-call";
import { handleStep } from "@/lib/calls/route-helpers";
import { analyseFramingCall } from "@/lib/framing/call-analysis";
import { fillBriefFromCall } from "@/lib/framing/import-report";
import { fillProductionFromCall } from "@/lib/production/preprod/fill-from-call";
import { fillStrategyFromCall } from "@/lib/strategy/import-report";

// Structured extraction of a long transcript can take a while.
export const maxDuration = 300;

// Extraction, then the report goes straight where the call was prepared:
// an exchange of the Master (master_brief_calls) fills the Brief Mix/Master
// from its own page; an exchange of the Stratégie (strategy_calls) fills
// the Stratégie (lib/strategy/import-report.ts); a creative exchange of the
// Conception (design_calls) becomes a source of the Conception and PO
// proposes intentions from it (lib/design/import-call.ts); a production call
// (production_calls) gives PO's proposals of decisions, hypotheses, actions
// and points to decide in the Préproduction
// (lib/production/preprod/fill-from-call.ts); any other call goes into
// the Cadrage as proposals, and PO reads it for the six dimensions
// (lib/framing/call-analysis.ts). The report itself stays in Calls.
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/calls/[callId]/extract">,
) {
  const { callId } = await params;
  return handleStep(callId, async (supabase, id) => {
    const extracted = await runExtraction(supabase, id);
    if (!extracted.ok) return extracted;
    const [{ data: exchange }, { data: strategyCall }, { data: designCall }] =
      await Promise.all([
        supabase
          .from("master_brief_calls")
          .select("id")
          .eq("call_id", id)
          .maybeSingle(),
        supabase
          .from("strategy_calls")
          .select("call_id")
          .eq("call_id", id)
          .maybeSingle(),
        supabase
          .from("design_calls")
          .select("call_id")
          .eq("call_id", id)
          .maybeSingle(),
      ]);
    if (exchange) return { ok: true, briefFilled: false };
    const access = await getAccess();
    if (strategyCall) {
      const filled =
        access.state === "approved" &&
        (await fillStrategyFromCall(supabase, access, id));
      return { ok: true, strategyFilled: filled };
    }
    if (designCall) {
      const filled =
        access.state === "approved" &&
        (await fillDesignFromCall(supabase, access, id));
      return { ok: true, designFilled: filled };
    }
    // Null at once for a call that is not a production call.
    const productionDeliverableId =
      access.state === "approved"
        ? await fillProductionFromCall(supabase, access, id)
        : null;
    if (productionDeliverableId) return { ok: true, productionDeliverableId };
    const filled = await fillBriefFromCall(supabase, id);
    const analysed =
      access.state === "approved"
        ? await analyseFramingCall(supabase, access, id)
        : false;
    return { ok: true, briefFilled: filled || analysed };
  });
}
