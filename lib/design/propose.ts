import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { DESIGN_INTENTIONS_INSTRUCTIONS } from "@/lib/ai/instructions/design-intentions";
import { extract } from "@/lib/ai/llm";
import {
  providerFailure,
  type ProviderFailure,
} from "@/lib/ai/provider-failure";
import { locateQuote } from "@/lib/ai/provenance";
import { designIntentionsSchema } from "@/lib/ai/schemas/design-intentions";
import type { ConceptionData } from "@/lib/design/conception";
import { DIRECTION_KEY, type DesignTopic } from "@/lib/design/intentions";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** A passage PO may lean on: one item of a call report, or a whole brief. */
export type DesignPassage = {
  id: string;
  text: string;
  // The report item it is, for a call: kept as provenance.
  reportItemId?: string;
};

export type ProposeResult =
  | { ok: true; count: number }
  | { ok: false; error: "provider" | "write" }
  | ProviderFailure;

// More would bury the page: the person confirms them one by one.
const MAX_PROPOSALS = 40;
const MAX_VALUE = 2000;
const MAX_QUOTE = 1000;

/**
 * PO reads a source of the Conception (a processed creative call, an
 * imported brief) and proposes intentions, then the code keeps only what it
 * can verify: a known passage, a quote found verbatim in it, known targets.
 * A decision about several deliverables becomes one proposal per deliverable
 * pointing at the same source (never copied); one PO cannot place stays
 * « à rattacher ». Nothing is confirmed here: a person decides. Written with
 * the user's session (RLS: design_can_write).
 */
export async function proposeDesignIntentions(
  supabase: Client,
  {
    organizationId,
    projectId,
    sourceId,
    sourceType,
    passages,
    data,
  }: {
    organizationId: string;
    projectId: string;
    sourceId: string;
    sourceType: "call" | "import";
    passages: DesignPassage[];
    data: Pick<ConceptionData, "deliverables" | "intentions">;
  },
): Promise<ProposeResult> {
  if (passages.length === 0) return { ok: true, count: 0 };

  // Short keys for the model; the ids never leave the server.
  const targets = data.deliverables.map((d, index) => ({
    key: `d${index + 1}`,
    id: d.id,
    title: d.title,
  }));
  const byKey = new Map(targets.map((t) => [t.key, t.id]));
  const input = [
    "<targets>",
    `${DIRECTION_KEY} : direction créative d'ensemble`,
    ...targets.map((t) => `${t.key} : ${t.title}`),
    "</targets>",
    ...passages.map((p) => `<source id="${p.id}">\n${p.text}\n</source>`),
  ].join("\n");

  let output;
  try {
    ({ output } = await extract(
      designIntentionsSchema,
      input,
      DESIGN_INTENTIONS_INSTRUCTIONS,
    ));
  } catch (error) {
    console.error("proposeDesignIntentions:", error);
    return providerFailure(error);
  }

  // Already there (proposed or confirmed): not proposed twice.
  const known = new Set(
    data.intentions.map(
      (i) => `${i.deliverableId ?? i.target}|${i.topic}|${i.value.trim()}`,
    ),
  );
  const byId = new Map(passages.map((p) => [p.id, p]));
  const rows: Database["public"]["Tables"]["design_intentions"]["Insert"][] =
    [];
  for (const item of output.intentions) {
    const passage = byId.get(item.source.trim());
    const quote = item.quote.trim();
    const value = item.text.trim();
    if (!passage || !value || value.length > MAX_VALUE) continue;
    if (quote.split(/\s+/).length < 3 || quote.length > MAX_QUOTE) continue;
    if (
      locateQuote(quote, { text: passage.text, segments: [] }).status ===
      "missing"
    )
      continue;

    const keys = [...new Set(item.targets.map((k) => k.trim()))].filter(
      (k) => k === DIRECTION_KEY || byKey.has(k),
    );
    const places: Array<{ target: string; deliverableId: string | null }> =
      keys.length === 0
        ? [{ target: "unassigned", deliverableId: null }]
        : keys.map((k) =>
            k === DIRECTION_KEY
              ? { target: "direction", deliverableId: null }
              : { target: "deliverable", deliverableId: byKey.get(k)! },
          );
    for (const place of places) {
      const key = `${place.deliverableId ?? place.target}|${item.topic}|${value}`;
      if (known.has(key)) continue;
      known.add(key);
      rows.push({
        organization_id: organizationId,
        project_id: projectId,
        target: place.target,
        design_deliverable_id: place.deliverableId,
        topic: item.topic satisfies DesignTopic,
        value,
        source_type: sourceType,
        source_id: sourceId,
        source_report_item_id: passage.reportItemId ?? null,
        source_quote: quote,
      });
    }
  }
  const kept = rows.slice(0, MAX_PROPOSALS);
  if (kept.length === 0) return { ok: true, count: 0 };
  const { error } = await supabase.from("design_intentions").insert(kept);
  if (error) {
    console.error("proposeDesignIntentions insert:", error.code, error.message);
    return { ok: false, error: "write" };
  }
  return { ok: true, count: kept.length };
}
