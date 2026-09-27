import "server-only";

import { FRAMING_DICTATION_INSTRUCTIONS } from "@/lib/ai/instructions/framing-dictation";
import {
  framingDictationSchema,
  type FramingDictation,
} from "@/lib/ai/schemas/framing-dictation";
import { BRIEF_TEXT_FIELDS, toBriefField } from "@/lib/framing/brief";
import {
  framingProposalSchema,
  type FramingChange,
  type FramingProposal,
} from "@/lib/framing/voice-proposal";
import { createClient } from "@/lib/supabase/server";
import type { Locate, VoiceAdapter } from "@/lib/voice/engine";

/** Dictation adapter of the Framing stage: the Brief, needs, team, open points. */

type FramingState = {
  brief: Record<(typeof BRIEF_TEXT_FIELDS)[number], string | null>;
  needs: string[];
  constraints: string[];
  team: string[];
  openPoints: string[];
};

async function loadState(projectId: string): Promise<FramingState | null> {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;

  const [fields, needs, constraints, team, points] = await Promise.all([
    supabase
      .from("current_field_values")
      .select("field_key, value, status")
      .eq("project_id", projectId)
      .eq("deliverable", "brief"),
    supabase
      .from("needs")
      .select("label")
      .eq("project_id", projectId)
      .neq("review_status", "rejected"),
    supabase
      .from("framing_constraints")
      .select("text")
      .eq("project_id", projectId)
      .neq("review_status", "rejected"),
    supabase
      .from("project_team_members")
      .select("display_name")
      .eq("project_id", projectId)
      .neq("review_status", "rejected"),
    supabase
      .from("open_points")
      .select("question")
      .eq("project_id", projectId)
      .eq("status", "open"),
  ]);

  const valueOf = (key: (typeof BRIEF_TEXT_FIELDS)[number]) => {
    const row = fields.data?.find((r) => r.field_key === key);
    return toBriefField(key, row ?? undefined, null).value;
  };
  return {
    brief: {
      objective: valueOf("objective"),
      timing: valueOf("timing"),
    },
    needs: (needs.data ?? []).map((n) => n.label),
    constraints: (constraints.data ?? []).map((c) => c.text),
    team: (team.data ?? []).map((m) => m.display_name),
    openPoints: (points.data ?? []).map((p) => p.question),
  };
}

function describe(state: FramingState): string {
  const list = (items: string[]) =>
    items.length ? items.map((i) => `- ${i}`).join("\n") : "(aucun)";
  return [
    `Objectif : ${state.brief.objective ?? "(vide)"}`,
    `Temporalité : ${state.brief.timing ?? "(vide)"}`,
    `Besoins :\n${list(state.needs)}`,
    `Cadre & contraintes :\n${list(state.constraints)}`,
    `Équipe :\n${list(state.team)}`,
    `Points ouverts :\n${list(state.openPoints)}`,
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
function plain(change: FramingChange): FramingChange {
  const strip = (text: string) => text.replace(/\*\*|__/g, "");
  switch (change.kind) {
    case "brief":
      return { ...change, value: strip(change.value) };
    case "need":
      return { ...change, label: strip(change.label) };
    case "constraint":
      return { ...change, text: strip(change.text) };
    case "team":
      return {
        ...change,
        name: strip(change.name),
        role: change.role && strip(change.role),
      };
    case "open_point":
      return { ...change, question: strip(change.question) };
  }
}

/** Code, not the model, decides what is new: duplicates and no-ops are dropped. */
function toProposals(
  output: FramingDictation,
  state: FramingState,
  locate: Locate,
): FramingProposal[] {
  const heard = output;
  const changes: Array<{ change: FramingChange; before: string | null }> = [];

  for (const field of BRIEF_TEXT_FIELDS) {
    const value = heard.brief?.[field];
    const before = state.brief[field];
    if (!value || normalize(value.value) === normalize(before ?? "")) continue;
    changes.push({
      change: { kind: "brief", field, value: value.value, quote: value.quote },
      before,
    });
  }

  const fresh = (existing: string[]) => {
    const seen = new Set(existing.map(normalize));
    return (text: string) => {
      const key = normalize(text);
      if (key === "" || seen.has(key)) return false;
      seen.add(key);
      return true;
    };
  };
  const newNeed = fresh(state.needs);
  const newConstraint = fresh(state.constraints);
  const newMember = fresh(state.team);
  const newPoint = fresh(state.openPoints);

  for (const need of heard.needs.filter((n) => newNeed(n.label)))
    changes.push({ change: { kind: "need", ...need }, before: null });
  for (const constraint of heard.constraints.filter((c) =>
    newConstraint(c.text),
  ))
    changes.push({
      change: { kind: "constraint", ...constraint },
      before: null,
    });
  for (const member of heard.team.filter((m) => newMember(m.name)))
    changes.push({
      change: { kind: "team", ...member, role: member.role ?? null },
      before: null,
    });
  for (const point of heard.openPoints.filter((p) => newPoint(p.question)))
    changes.push({ change: { kind: "open_point", ...point }, before: null });

  return changes.flatMap(({ change, before }) => {
    const parsed = framingProposalSchema.safeParse(plain(change));
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

export const framingVoice: VoiceAdapter<
  FramingState,
  FramingDictation,
  FramingProposal
> = {
  loadState,
  describe,
  schema: framingDictationSchema,
  instructions: FRAMING_DICTATION_INSTRUCTIONS,
  toProposals,
};
