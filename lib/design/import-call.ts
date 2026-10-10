import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Access } from "@/lib/auth/access";
import { loadConception } from "@/lib/design/conception";
import { proposeDesignIntentions } from "@/lib/design/propose";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/**
 * Right after the report of a creative call is saved (« Préparer un échange
 * créatif »), the call becomes a source of the Conception — its transcript,
 * report, decisions and actions, kept once — and PO reads the report's items
 * for candidate intentions, attached to the deliverables they concern, to
 * be confirmed by a person (lib/design/propose.ts). The work counts as
 * started. Only the first report of a call is read; a call already turned
 * into a source is not read twice. Returns whether the Conception now holds
 * the call, so the processing can open it.
 */
export async function fillDesignFromCall(
  supabase: Client,
  access: Access,
  callId: string,
): Promise<boolean> {
  const { data: call } = await supabase
    .from("design_calls")
    .select("project_id, calls(title)")
    .eq("call_id", callId)
    .maybeSingle();
  if (!call || !access.organizationId) return false;
  const projectId = call.project_id;

  const { data: reports } = await supabase
    .from("call_reports")
    .select("id")
    .eq("call_id", callId)
    .order("created_at", { ascending: false });
  if (reports?.length !== 1) return false;

  // Starting twice is harmless; refused when the Stratégie is not validated:
  // then nothing is written.
  const { error: startError } = await supabase.rpc("start_design", {
    p_project_id: projectId,
  });
  if (startError) {
    console.error("[design] auto start failed:", startError.message);
    return false;
  }

  const { data: existing } = await supabase
    .from("design_sources")
    .select("id")
    .eq("call_id", callId)
    .maybeSingle();
  if (existing) return true;

  const { data: source, error: sourceError } = await supabase
    .from("design_sources")
    .insert({
      organization_id: access.organizationId,
      project_id: projectId,
      kind: "call",
      call_id: callId,
      title: call.calls?.title || fr.conceptionCall.defaultTitle,
    })
    .select("id")
    .single();
  if (sourceError || !source) {
    console.error("[design] source failed:", sourceError?.message);
    return false;
  }

  const [{ data: items }, project] = await Promise.all([
    supabase
      .from("report_items")
      .select("id, what, quote")
      .eq("report_id", reports[0].id)
      .order("position"),
    getProject(projectId),
  ]);
  const data = project ? await loadConception(project, access) : null;
  if (!data) return true;

  // A provider failure leaves the source in place, without proposals.
  const proposed = await proposeDesignIntentions(supabase, {
    organizationId: access.organizationId,
    projectId,
    sourceId: source.id,
    sourceType: "call",
    passages: (items ?? []).map((item) => ({
      id: `item:${item.id}`,
      text: [item.what, item.quote].filter(Boolean).join("\n"),
      reportItemId: item.id,
    })),
    data,
  });
  if (!proposed.ok) console.error("[design] auto proposals:", proposed.error);
  return true;
}
