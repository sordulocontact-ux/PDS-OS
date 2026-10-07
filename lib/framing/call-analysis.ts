import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { transcriptSchema } from "@/lib/ai/schemas/transcript";
import type { Access } from "@/lib/auth/access";
import { analyseForFraming } from "@/lib/framing/analyse";
import { loadFramingKnowledge } from "@/lib/framing/knowledge";
import type { Database } from "@/lib/supabase/database.types";

/**
 * After a framing call (ticket § 6): PO sees that it belongs to the Cadrage
 * (a project call, not an exchange of the Master, while the Cadrage takes
 * changes) and reads its transcript for the six dimensions. The report
 * stays in Calls; only proposals « à confirmer » reach the Cadrage, once
 * per report. Runs with the user's client: RLS decides.
 */
export async function analyseFramingCall(
  supabase: SupabaseClient<Database>,
  access: Access,
  callId: string,
): Promise<boolean> {
  const { data: call } = await supabase
    .from("calls")
    .select("project_id")
    .eq("id", callId)
    .maybeSingle();
  if (!call?.project_id) return false;
  const [exchange, report, transcript] = await Promise.all([
    supabase
      .from("master_brief_calls")
      .select("id")
      .eq("call_id", callId)
      .maybeSingle(),
    supabase
      .from("call_reports")
      .select("id")
      .eq("call_id", callId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("transcripts")
      .select("text, segments")
      .eq("call_id", callId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (exchange.data || !report.data) return false;
  const parsed = transcriptSchema.safeParse(transcript.data);
  if (!parsed.success) return false;

  // Once per report: a re-extraction would duplicate the proposals.
  const { data: already } = await supabase
    .from("report_items")
    .select("id")
    .eq("report_id", report.data.id)
    .eq("kind", "brief_fact")
    .limit(1);
  if ((already ?? []).length > 0) return false;

  const knowledge = await loadFramingKnowledge(call.project_id, access);
  const state = knowledge?.framing.stage?.state;
  if (!knowledge || (state !== "not_started" && state !== "in_progress"))
    return false;
  const result = await analyseForFraming(supabase, knowledge, {
    kind: "call",
    reportId: report.data.id,
    transcript: parsed.data,
  });
  return result.ok && result.proposed > 0;
}
