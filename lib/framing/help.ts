import "server-only";

import { framingHelpInstructions } from "@/lib/ai/instructions/framing-help";
import { extract } from "@/lib/ai/llm";
import { locateQuote } from "@/lib/ai/provenance";
import { framingHelpSchema } from "@/lib/ai/schemas/framing-help";
import {
  QUESTIONS,
  TEXT_QUESTION_KEYS,
  type QuestionKey,
} from "@/lib/framing/dimensions";
import { fr } from "@/lib/i18n/fr";
import { projectKindLabel } from "@/lib/projects/labels";
import type { ProjectDetail } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

type Source = { id: string; label: string; text: string };

export type HelpSuggestion = {
  text: string;
  source: string;
  sourceLabel: string;
  quote: string;
};

// At most this many call report items are sent: the most recent ones.
const MAX_ITEMS = 40;

/**
 * What PO may lean on for « M'aider à définir »: the initial context, the
 * project's facts, the Brief answers already confirmed, the call items.
 */
async function loadSources(project: ProjectDetail): Promise<Source[]> {
  const supabase = await createClient();
  const [fields, items] = await Promise.all([
    supabase
      .from("current_field_values")
      .select("field_key, value, status")
      .eq("project_id", project.id)
      .eq("deliverable", "brief")
      .in("field_key", TEXT_QUESTION_KEYS)
      .eq("status", "confirmed"),
    supabase
      .from("report_items")
      .select(
        "id, what, quote, created_at, call_reports!inner(calls!inner(project_id, title))",
      )
      .eq("call_reports.calls.project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(MAX_ITEMS),
  ]);
  const t = fr.framingIntel;
  const sources: Source[] = [
    {
      id: "project",
      label: t.sources.projectSheet,
      text: [
        project.title,
        projectKindLabel({
          type: project.type,
          musicFormat: project.musicFormat,
          contentFormatName: project.contentFormat?.name ?? null,
        }),
        project.artistName,
        ...project.masters.map((m) => `${m.title} (${m.artists})`),
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
  if (project.initialContext?.trim())
    sources.push({
      id: "context",
      label: t.sources.initialContext,
      text: project.initialContext,
    });
  for (const row of fields.data ?? []) {
    if (typeof row.value !== "string") continue;
    const key = row.field_key as QuestionKey;
    sources.push({
      id: `brief:${key}`,
      label: t.questions[key]?.label ?? key,
      text: row.value,
    });
  }
  for (const item of items.data ?? [])
    sources.push({
      id: `item:${item.id}`,
      label: fr.framingGuide.brief.callTitle(item.call_reports.calls.title),
      text: `${item.what}\n${item.quote}`,
    });
  return sources;
}

export type HelpResult =
  | { ok: true; suggestions: HelpSuggestion[] }
  | { ok: false; error: "no_sources" | "provider" };

/**
 * Asks the model for short answers to one question, then keeps only what
 * the code can verify: a known source id and a passage found verbatim in it.
 */
export async function helpWithQuestion(
  project: ProjectDetail,
  key: QuestionKey,
): Promise<HelpResult> {
  const sources = (await loadSources(project)).filter(
    (s) => s.id !== `brief:${key}`,
  );
  // The project's own sheet alone says too little to answer anything.
  if (sources.length <= 1) return { ok: false, error: "no_sources" };

  const input = sources
    .map((s) => `<source id="${s.id}">\n${s.text}\n</source>`)
    .join("\n");
  const question = fr.framingIntel.questions[key];

  let output;
  try {
    ({ output } = await extract(
      framingHelpSchema,
      input,
      framingHelpInstructions(question.ask, question.why),
    ));
  } catch (error) {
    console.error("helpWithQuestion:", error);
    return { ok: false, error: "provider" };
  }

  const byId = new Map(sources.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const suggestions = output.choices.flatMap((item): HelpSuggestion[] => {
    const source = byId.get(item.source.trim());
    const quote = item.quote.trim();
    const text = item.text.replace(/\*+/g, "").trim();
    const lower = text.toLowerCase();
    if (!source || !text || seen.has(lower)) return [];
    if (quote.split(/\s+/).length < 3) return [];
    if (
      locateQuote(quote, { text: source.text, segments: [] }).status ===
      "missing"
    )
      return [];
    seen.add(lower);
    return [{ text, source: source.id, sourceLabel: source.label, quote }];
  });
  return { ok: true, suggestions };
}

export const helpAvailable = (key: QuestionKey) => QUESTIONS[key].poHelp;
