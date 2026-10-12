import "server-only";

import {
  narrativeSummaryInstructions,
  strategyDraftInstructions,
} from "@/lib/ai/instructions/strategy-draft";
import { extract } from "@/lib/ai/llm";
import {
  narrativeSummarySchema,
  strategyDraftSchema,
} from "@/lib/ai/schemas/strategy-draft";
import { answerOf } from "@/lib/framing/assess";
import {
  NARRATIVE_PARTS,
  NARRATIVE_SUMMARY,
  STRATEGIC_OBJECTIVE,
} from "@/lib/framing/brief";
import { QUESTIONS, TEXT_QUESTION_KEYS } from "@/lib/framing/dimensions";
import { fr } from "@/lib/i18n/fr";
import { draftConfidence } from "@/lib/strategy/draft-confidence";
import {
  fieldsToDraft,
  priorityQuestions,
  verifyDrafts,
  type DraftField,
  type DraftSource,
  type PriorityQuestions,
} from "@/lib/strategy/draft-plan";
import {
  narrativeRepetitions,
  verifyContradictions,
  type NarrativeArbitration,
  type NarrativeText,
  type SummaryLength,
  type SummaryTone,
} from "@/lib/strategy/narrative-review";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// At most this many call report items are sent: the most recent ones.
const MAX_ITEMS = 80;
// source_label is at most 120 characters in SQL.
const label = (text: string) => text.slice(0, 120);

/**
 * What PO may lean on, read with the user's session (RLS): the confirmed
 * text answers of the Cadrage (the legal ones stay out: never a lever nor a
 * story), the project's initial context and its call report items.
 */
async function loadDraftSources(
  supabase: Supabase,
  projectId: string,
): Promise<DraftSource[]> {
  const [brief, project, items] = await Promise.all([
    supabase
      .from("current_field_values")
      .select("field_key, value")
      .eq("project_id", projectId)
      .eq("deliverable", "brief")
      .eq("status", "confirmed"),
    supabase
      .from("projects")
      .select("initial_context")
      .eq("id", projectId)
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
  const questions = fr.framingIntel.questions;
  const briefSources = (brief.data ?? []).flatMap((row): DraftSource[] => {
    const key = TEXT_QUESTION_KEYS.find((k) => k === row.field_key);
    if (!key || QUESTIONS[key].dimension === "legal") return [];
    const answer = answerOf(key, row.value);
    if (answer?.kind !== "text" || answer.text.trim() === "") return [];
    return [
      {
        id: `brief:${key}`,
        label: t.briefSource(questions[key].label),
        text: answer.text,
        fromBrief: true,
      },
    ];
  });
  const context = project.data?.initial_context?.trim();
  const contextSources: DraftSource[] = context
    ? [
        {
          id: "context:initial",
          label: fr.strategyDraft.initialContext,
          text: context,
          fromBrief: false,
        },
      ]
    : [];
  const itemSources = (items.data ?? []).map((item): DraftSource => ({
    id: `item:${item.id}`,
    label: t.callSource(item.call_reports.calls.title),
    text: `${item.what}\n${item.quote}`,
    fromBrief: false,
  }));
  return [...briefSources, ...contextSources, ...itemSources];
}

async function currentStrategy(supabase: Supabase, projectId: string) {
  const { data } = await supabase
    .from("current_field_values")
    .select("field_key, value, status")
    .eq("project_id", projectId)
    .eq("deliverable", "strategy");
  const rows = new Map((data ?? []).map((r) => [r.field_key, r]));
  return {
    statusOf: (key: string) => rows.get(key)?.status ?? null,
    // A rejected value counts as empty.
    textOf: (key: string) => {
      const row = rows.get(key);
      return row && row.status !== "rejected" && typeof row.value === "string"
        ? row.value
        : null;
    },
  };
}

const generatedRow = (
  organizationId: string,
  projectId: string,
  fieldKey: string,
  draft: {
    value: string;
    label: string;
    quote: string | null;
    confidence: string;
  },
) => ({
  organization_id: organizationId,
  project_id: projectId,
  deliverable: "strategy",
  field_key: fieldKey,
  value: draft.value,
  status: "proposed",
  source_type: "generated",
  source_label: label(draft.label),
  source_quote: draft.quote,
  confidence: draft.confidence,
});

export type DraftResult =
  | { ok: true; created: number; questions: PriorityQuestions }
  | {
      ok: false;
      error: "no_sources" | "provider" | "stage_locked" | "write";
    };

/**
 * « Préparer un brouillon » (MKT-S1-09): the strategic objective taken as is
 * from the confirmed Cadrage objective (code), then the texts PO drafts from
 * the sources, kept only once verified, each a proposal with its source and
 * the code's confidence. A confirmed value is never replaced; what nothing
 * answers comes back as the questions to ask first. `only` drafts one field
 * again (« Proposer à nouveau »).
 */
export async function draftStrategy(
  organizationId: string,
  projectId: string,
  only: DraftField | null = null,
): Promise<DraftResult> {
  const supabase = await createClient();
  const [sources, strategy] = await Promise.all([
    loadDraftSources(supabase, projectId),
    currentStrategy(supabase, projectId),
  ]);
  if (sources.length === 0) return { ok: false, error: "no_sources" };

  const rows: ReturnType<typeof generatedRow>[] = [];
  const objective = sources.find((s) => s.id === "brief:objective");
  if (
    !only &&
    objective &&
    strategy.statusOf(STRATEGIC_OBJECTIVE) !== "confirmed" &&
    !strategy.textOf(STRATEGIC_OBJECTIVE)
  )
    rows.push(
      generatedRow(organizationId, projectId, STRATEGIC_OBJECTIVE, {
        value: objective.text,
        label: objective.label,
        quote: objective.text,
        confidence: "high",
      }),
    );

  const wanted = fieldsToDraft(strategy.statusOf, only);
  let drafted: DraftField[] = [];
  if (wanted.length > 0) {
    const input = sources
      .map((s) => `<source id="${s.id}">\n${s.text}\n</source>`)
      .join("\n");
    let output;
    try {
      ({ output } = await extract(
        strategyDraftSchema,
        input,
        strategyDraftInstructions(wanted),
      ));
    } catch (error) {
      console.error("draftStrategy:", error);
      return { ok: false, error: "provider" };
    }
    const verified = verifyDrafts(output.drafts, sources, wanted);
    drafted = verified.map((d) => d.field);
    for (const d of verified)
      rows.push(generatedRow(organizationId, projectId, d.field, d));
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("field_values").insert(rows);
    if (error?.code === "42501") return { ok: false, error: "stage_locked" };
    if (error) {
      console.error("draftStrategy insert:", error);
      return { ok: false, error: "write" };
    }
  }
  return {
    ok: true,
    created: rows.length,
    questions: priorityQuestions(
      wanted,
      drafted,
      (field) => !!strategy.textOf(field),
    ),
  };
}

export type SummaryResult =
  | { ok: true; arbitrations: NarrativeArbitration[] }
  | {
      ok: false;
      error:
        | "no_parts"
        | "confirmed"
        | "provider"
        | "invalid"
        | "stage_locked"
        | "write";
    };

/**
 * « Rédiger la synthèse » (MKT-S1-06): the narrative parts written so far
 * (and the angle) summed up by PO in the tone and length chosen, stored as a
 * proposal; a confirmed synthesis is never replaced (the person edits it).
 * Returned with it: the repetitions found by the code and the contradictions
 * PO points, each quote verified in its part, to arbitrate.
 */
export async function summarizeNarrative(
  organizationId: string,
  projectId: string,
  tone: SummaryTone,
  length: SummaryLength,
): Promise<SummaryResult> {
  const supabase = await createClient();
  const strategy = await currentStrategy(supabase, projectId);
  if (strategy.statusOf(NARRATIVE_SUMMARY) === "confirmed")
    return { ok: false, error: "confirmed" };
  const parts: NarrativeText[] = NARRATIVE_PARTS.flatMap((key) => {
    const text = strategy.textOf(key)?.trim();
    return text ? [{ key, text }] : [];
  });
  if (parts.length === 0) return { ok: false, error: "no_parts" };
  const angle = strategy.textOf("narrative")?.trim();

  const input = [
    ...parts.map((p) => `<part key="${p.key}">\n${p.text}\n</part>`),
    ...(angle ? [`<angle>\n${angle}\n</angle>`] : []),
  ].join("\n");
  let output;
  try {
    ({ output } = await extract(
      narrativeSummarySchema,
      input,
      narrativeSummaryInstructions(tone, length),
    ));
  } catch (error) {
    console.error("summarizeNarrative:", error);
    return { ok: false, error: "provider" };
  }
  const summary = output.summary.trim();
  if (summary === "" || summary.length > 2000)
    return { ok: false, error: "invalid" };

  const { error } = await supabase.from("field_values").insert(
    generatedRow(organizationId, projectId, NARRATIVE_SUMMARY, {
      value: summary,
      label: fr.strategyDraft.summarySource,
      quote: null,
      confidence: draftConfidence({
        draft: summary,
        source: parts.map((p) => p.text).join("\n"),
        fromBrief: false,
      }),
    }),
  );
  if (error?.code === "42501") return { ok: false, error: "stage_locked" };
  if (error) {
    console.error("summarizeNarrative insert:", error);
    return { ok: false, error: "write" };
  }
  return {
    ok: true,
    arbitrations: [
      ...narrativeRepetitions(parts),
      ...verifyContradictions(output.contradictions, parts),
    ],
  };
}
