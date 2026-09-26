import "server-only";

import { STRATEGY_DICTATION_INSTRUCTIONS } from "@/lib/ai/instructions/strategy-dictation";
import {
  strategyDictationSchema,
  type StrategyDictation,
} from "@/lib/ai/schemas/strategy-dictation";
import {
  STRATEGY_TEXT_FIELDS,
  toFieldState,
  type StrategyTextField,
} from "@/lib/framing/brief";
import {
  strategyProposalSchema,
  type StrategyChange,
  type StrategyProposal,
} from "@/lib/strategy/voice-proposal";
import { createClient } from "@/lib/supabase/server";
import type { Locate, VoiceAdapter } from "@/lib/voice/engine";

/**
 * Dictation adapter of the Launch strategy stage: positioning, audiences,
 * narrative, and new levers. Never lever states, deliverables or milestones.
 */

type StrategyState = {
  fields: Record<StrategyTextField, string | null>;
  levers: string[];
};

async function loadState(projectId: string): Promise<StrategyState | null> {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;

  const [fields, levers] = await Promise.all([
    supabase
      .from("current_field_values")
      .select("field_key, value, status")
      .eq("project_id", projectId)
      .eq("deliverable", "strategy"),
    supabase
      .from("levers")
      .select("label")
      .eq("project_id", projectId)
      .neq("review_status", "rejected"),
  ]);

  const valueOf = (key: StrategyTextField) => {
    const row = fields.data?.find((r) => r.field_key === key);
    return toFieldState("strategy", key, row ?? undefined, null).value;
  };
  return {
    fields: {
      positioning: valueOf("positioning"),
      audiences: valueOf("audiences"),
      narrative: valueOf("narrative"),
    },
    levers: (levers.data ?? []).map((l) => l.label),
  };
}

function describe(state: StrategyState): string {
  const levers = state.levers.length
    ? state.levers.map((l) => `- ${l}`).join("\n")
    : "(aucun)";
  return [
    `Positionnement : ${state.fields.positioning ?? "(vide)"}`,
    `Publics : ${state.fields.audiences ?? "(vide)"}`,
    `Narratif : ${state.fields.narrative ?? "(vide)"}`,
    `Leviers :\n${levers}`,
  ].join("\n");
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** The fields are plain text: emphasis markers the model may add are removed. */
function plain(change: StrategyChange): StrategyChange {
  const strip = (text: string) => text.replace(/\*\*|__/g, "");
  return change.kind === "field"
    ? { ...change, value: strip(change.value) }
    : { ...change, label: strip(change.label) };
}

/** Code, not the model, decides what is new: duplicates and no-ops are dropped. */
function toProposals(
  heard: StrategyDictation,
  state: StrategyState,
  locate: Locate,
): StrategyProposal[] {
  const changes: Array<{ change: StrategyChange; before: string | null }> = [];

  for (const field of STRATEGY_TEXT_FIELDS) {
    const value = heard[field];
    const before = state.fields[field];
    if (!value || normalize(value.value) === normalize(before ?? "")) continue;
    changes.push({
      change: { kind: "field", field, value: value.value, quote: value.quote },
      before,
    });
  }

  const seen = new Set(state.levers.map(normalize));
  for (const lever of heard.levers) {
    const key = normalize(lever.label);
    if (key === "" || seen.has(key)) continue;
    seen.add(key);
    changes.push({ change: { kind: "lever", ...lever }, before: null });
  }

  return changes.flatMap(({ change, before }) => {
    const parsed = strategyProposalSchema.safeParse(plain(change));
    if (!parsed.success) return [];
    return [
      {
        ...parsed.data,
        id: crypto.randomUUID(),
        before,
        located: locate(parsed.data.quote),
      },
    ];
  });
}

export const strategyVoice: VoiceAdapter<
  StrategyState,
  StrategyDictation,
  StrategyProposal
> = {
  loadState,
  describe,
  schema: strategyDictationSchema,
  instructions: STRATEGY_DICTATION_INSTRUCTIONS,
  toProposals,
};
