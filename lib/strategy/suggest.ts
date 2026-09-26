import "server-only";

import { STRATEGY_CHOICES_INSTRUCTIONS } from "@/lib/ai/instructions/strategy-choices";
import { extract } from "@/lib/ai/llm";
import { locateQuote } from "@/lib/ai/provenance";
import { strategyChoicesSchema } from "@/lib/ai/schemas/strategy-choices";
import {
  BRIEF_TEXT_FIELDS,
  STRATEGY_TEXT_FIELDS,
  type StrategyTextField,
} from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import type { ChoiceSuggestion } from "@/lib/strategy/choices";
import { createClient } from "@/lib/supabase/server";

type Source = { id: string; label: string; text: string };

// At most this many call report items are sent: the most recent ones.
const MAX_ITEMS = 80;

/**
 * The passages the model may lean on: confirmed Brief fields and the items of
 * the project's call reports. Read with the user's session (RLS).
 */
async function loadSources(projectId: string): Promise<Source[]> {
  const supabase = await createClient();
  const [brief, items] = await Promise.all([
    supabase
      .from("current_field_values")
      .select("field_key, value, status")
      .eq("project_id", projectId)
      .eq("deliverable", "brief")
      .eq("status", "confirmed"),
    supabase
      .from("report_items")
      .select(
        "id, what, quote, created_at, call_reports!inner(calls!inner(project_id, title))",
      )
      .eq("call_reports.calls.project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(MAX_ITEMS),
  ]);

  const t = fr.strategy.choices;
  const briefSources = (brief.data ?? []).flatMap((row): Source[] => {
    const key = row.field_key as (typeof BRIEF_TEXT_FIELDS)[number];
    if (!BRIEF_TEXT_FIELDS.includes(key) || typeof row.value !== "string")
      return [];
    return [
      {
        id: `brief:${key}`,
        label: t.briefSource(fr.framing.fields[key]),
        text: row.value,
      },
    ];
  });
  const itemSources = (items.data ?? []).map((item): Source => ({
    id: `item:${item.id}`,
    label: t.callSource(item.call_reports.calls.title),
    text: `${item.what}\n${item.quote}`,
  }));
  return [...briefSources, ...itemSources];
}

export type SuggestResult =
  | { ok: true; suggestions: Record<StrategyTextField, ChoiceSuggestion[]> }
  | { ok: false; error: "no_sources" | "provider" };

/**
 * Asks the model which closed answers the sources support, then keeps only
 * what the code can verify: a known source id and a passage found verbatim in
 * it. Anything else is dropped as a likely hallucination.
 */
export async function suggestStrategyChoices(
  projectId: string,
): Promise<SuggestResult> {
  const sources = await loadSources(projectId);
  if (sources.length === 0) return { ok: false, error: "no_sources" };

  const input = sources
    .map((s) => `<source id="${s.id}">\n${s.text}\n</source>`)
    .join("\n");

  let output;
  try {
    ({ output } = await extract(
      strategyChoicesSchema,
      input,
      STRATEGY_CHOICES_INSTRUCTIONS,
    ));
  } catch (error) {
    console.error("suggestStrategyChoices:", error);
    return { ok: false, error: "provider" };
  }

  const byId = new Map(sources.map((s) => [s.id, s]));
  const verify = (
    items: Array<{ choice: string; source: string; quote: string }>,
  ): ChoiceSuggestion[] => {
    const seen = new Set<string>();
    return items.flatMap((item) => {
      const source = byId.get(item.source.trim());
      const quote = item.quote.trim();
      if (!source || seen.has(item.choice)) return [];
      if (quote.split(/\s+/).length < 3) return [];
      const found = locateQuote(quote, { text: source.text, segments: [] });
      if (found.status === "missing") return [];
      seen.add(item.choice);
      return [
        {
          choice: item.choice,
          source: source.id,
          sourceLabel: source.label,
          quote,
        },
      ];
    });
  };

  const suggestions = Object.fromEntries(
    STRATEGY_TEXT_FIELDS.map((field) => [field, verify(output[field])]),
  ) as Record<StrategyTextField, ChoiceSuggestion[]>;
  return { ok: true, suggestions };
}
