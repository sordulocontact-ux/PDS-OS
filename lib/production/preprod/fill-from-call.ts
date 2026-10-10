import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { PRODUCTION_CALL_ITEMS_INSTRUCTIONS } from "@/lib/ai/instructions/production-call-items";
import { extract } from "@/lib/ai/llm";
import { locateQuote } from "@/lib/ai/provenance";
import { productionCallItemsSchema } from "@/lib/ai/schemas/production-call-items";
import type { Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import type { Database } from "@/lib/supabase/database.types";

import { agendaTopics } from "./reads";
import { CALL_ITEM_KINDS, type CallItemKind } from "./types";

type Client = SupabaseClient<Database>;

// More would bury the section: the person confirms them one by one.
const MAX_PROPOSALS = 40;
const MAX_BODY = 2000;
const MAX_QUOTE = 1000;

const numbersOf = (text: string) => text.match(/\d+(?:[.,]\d+)?/g) ?? [];

/**
 * Right after the report of a production call is saved, PO reads its items
 * and proposes the points of the technical call — décision, hypothèse,
 * action proposée, point à arbitrer — each filed under the closest topic of
 * the call's agenda (else « Autres »). The code keeps only what it can
 * verify: a known item, a quote found verbatim in it, a known nature, no
 * number absent from the source. Everything stays « proposé » until a
 * person confirms it. Written with the user's session (RLS: the owner while
 * Production runs). Only the first report of a call is read, and a call
 * already read is not read twice. Returns the deliverable whose
 * Préproduction now holds the call (the processing opens it), or null when
 * the call is not a production call.
 */
export async function fillProductionFromCall(
  supabase: Client,
  access: Access,
  callId: string,
): Promise<string | null> {
  const { data: link } = await supabase
    .from("production_calls")
    .select(
      "organization_id, project_id, sheet_id, production_sheets(deliverable_id)",
    )
    .eq("call_id", callId)
    .maybeSingle();
  const deliverableId = link?.production_sheets?.deliverable_id ?? null;
  if (!link || !deliverableId || !access.organizationId) return null;

  const [{ data: reports }, { data: call }, { data: already }] =
    await Promise.all([
      supabase
        .from("call_reports")
        .select("id")
        .eq("call_id", callId)
        .order("created_at", { ascending: false }),
      supabase.from("calls").select("agenda").eq("id", callId).maybeSingle(),
      supabase
        .from("production_call_items")
        .select("id")
        .eq("call_id", callId)
        .eq("source", "call_report")
        .limit(1),
    ]);
  if (reports?.length !== 1 || (already?.length ?? 0) > 0) return deliverableId;

  const { data: items } = await supabase
    .from("report_items")
    .select("id, kind, what, who, why, quote")
    .eq("report_id", reports[0].id)
    .order("position");
  const passages = (items ?? []).map((item, index) => ({
    key: `s${index + 1}`,
    reportItemId: item.id,
    text: [item.what, item.who, item.why, item.quote]
      .filter(Boolean)
      .join("\n"),
  }));
  if (passages.length === 0) return deliverableId;

  const topics = agendaTopics(call?.agenda ?? null).map((topic, index) => ({
    key: `t${index + 1}`,
    topic,
  }));
  const input = [
    "<topics>",
    ...topics.map((t) => `${t.key} : ${t.topic}`),
    "</topics>",
    ...passages.map((p) => `<source id="${p.key}">\n${p.text}\n</source>`),
  ].join("\n");

  let output;
  try {
    ({ output } = await extract(
      productionCallItemsSchema,
      input,
      PRODUCTION_CALL_ITEMS_INSTRUCTIONS,
    ));
  } catch (error) {
    // A provider failure leaves the call without proposals.
    console.error("fillProductionFromCall:", error);
    return deliverableId;
  }

  const byKey = new Map(passages.map((p) => [p.key, p]));
  const topicOf = new Map(topics.map((t) => [t.key, t.topic]));
  const seen = new Set<string>();
  const rows: Database["public"]["Tables"]["production_call_items"]["Insert"][] =
    [];
  for (const item of output.items) {
    const passage = byKey.get(item.source.trim());
    const kind = item.kind.trim() as CallItemKind;
    const body = item.text.trim();
    const quote = item.quote.trim();
    if (!passage || !CALL_ITEM_KINDS.includes(kind)) continue;
    if (!body || body.length > MAX_BODY) continue;
    if (quote.split(/\s+/).length < 3 || quote.length > MAX_QUOTE) continue;
    if (
      locateQuote(quote, { text: passage.text, segments: [] }).status ===
      "missing"
    )
      continue;
    // No number of its own: every figure must come from the source.
    const known = new Set(numbersOf(passage.text));
    if (numbersOf(body).some((n) => !known.has(n))) continue;
    const topic =
      topicOf.get(item.topic.trim()) ?? fr.productionPreprod.call.otherTopic;
    const key = `${topic}|${kind}|${body}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      organization_id: link.organization_id,
      project_id: link.project_id,
      sheet_id: link.sheet_id,
      call_id: callId,
      topic: topic.slice(0, 200),
      kind,
      body,
      status: "proposed",
      source: "call_report",
      source_report_item_id: passage.reportItemId,
      source_quote: quote,
      position: rows.length,
    });
  }
  const kept = rows.slice(0, MAX_PROPOSALS);
  if (kept.length > 0) {
    const { error } = await supabase.from("production_call_items").insert(kept);
    if (error)
      console.error(
        "fillProductionFromCall insert:",
        error.code,
        error.message,
      );
  }
  return deliverableId;
}
