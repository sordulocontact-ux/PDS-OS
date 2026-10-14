import "server-only";

import { FRAMING_OBJECTIVE_CHOICES_INSTRUCTIONS } from "@/lib/ai/instructions/framing-objective-choices";
import { extract } from "@/lib/ai/llm";
import {
  providerFailure,
  type ProviderFailure,
} from "@/lib/ai/provider-failure";
import { locateQuote } from "@/lib/ai/provenance";
import { framingObjectiveChoicesSchema } from "@/lib/ai/schemas/framing-objective-choices";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

type Source = { id: string; label: string; text: string };

export type ObjectiveSuggestion = {
  text: string;
  source: string;
  sourceLabel: string;
  quote: string;
};

// At most this many call report items are sent: the most recent ones.
const MAX_ITEMS = 40;

/** The passages the model may lean on: the current objective and call items. */
async function loadSources(projectId: string): Promise<Source[]> {
  const supabase = await createClient();
  const [objective, items] = await Promise.all([
    supabase
      .from("current_field_values")
      .select("value, status")
      .eq("project_id", projectId)
      .eq("deliverable", "brief")
      .eq("field_key", "objective")
      .maybeSingle(),
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
  const objectiveSource: Source[] =
    objective.data && typeof objective.data.value === "string"
      ? [
          {
            id: "brief:objective",
            label: t.briefSource(fr.framing.fields.objective),
            text: objective.data.value,
          },
        ]
      : [];
  const itemSources = (items.data ?? []).map((item): Source => ({
    id: `item:${item.id}`,
    label: t.callSource(item.call_reports.calls.title),
    text: `${item.what}\n${item.quote}`,
  }));
  return [...objectiveSource, ...itemSources];
}

export type SuggestObjectiveResult =
  | { ok: true; suggestions: ObjectiveSuggestion[] }
  | { ok: false; error: "no_sources" | "provider" }
  | ProviderFailure;

/**
 * Asks the model for short objective rephrasings, then keeps only what the
 * code can verify: a known source id and a passage found verbatim in it.
 * Anything else is dropped as a likely hallucination.
 */
export async function suggestFramingObjective(
  projectId: string,
): Promise<SuggestObjectiveResult> {
  const sources = await loadSources(projectId);
  if (sources.length === 0) return { ok: false, error: "no_sources" };

  const input = sources
    .map((s) => `<source id="${s.id}">\n${s.text}\n</source>`)
    .join("\n");

  let output;
  try {
    ({ output } = await extract(
      framingObjectiveChoicesSchema,
      input,
      FRAMING_OBJECTIVE_CHOICES_INSTRUCTIONS,
    ));
  } catch (error) {
    console.error("suggestFramingObjective:", error);
    return providerFailure(error);
  }

  const byId = new Map(sources.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const suggestions: ObjectiveSuggestion[] = output.choices.flatMap((item) => {
    const source = byId.get(item.source.trim());
    const quote = item.quote.trim();
    const text = item.text.trim();
    const key = text.toLowerCase();
    if (!source || !text || seen.has(key)) return [];
    if (quote.split(/\s+/).length < 3) return [];
    const found = locateQuote(quote, { text: source.text, segments: [] });
    if (found.status === "missing") return [];
    seen.add(key);
    return [{ text, source: source.id, sourceLabel: source.label, quote }];
  });
  return { ok: true, suggestions };
}
