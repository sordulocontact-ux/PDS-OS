"use server";

import { z } from "zod";

import type { ProviderFailure } from "@/lib/ai/provider-failure";
import { orgId } from "@/lib/framing/actions/shared";
import {
  STRATEGY_TEXT_FIELDS,
  type StrategyTextField,
} from "@/lib/framing/brief";
import { fail, type ActionResult } from "@/lib/framing/result";
import { done } from "@/lib/strategy/actions/shared";
import {
  choicesKey,
  isChoiceOf,
  suggestionsKey,
  toChoiceValue,
  toSuggestions,
  type ChoiceSuggestion,
  type ChoiceValue,
} from "@/lib/strategy/choices";
import { suggestStrategyChoices } from "@/lib/strategy/suggest";
import { createClient } from "@/lib/supabase/server";

// Every write goes through the user's session: RLS lets only the owner write,
// and only while the strategy is in progress (strategy_is_editable).

const projectId = z.uuid();
const field = z.enum(STRATEGY_TEXT_FIELDS);

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function current(
  supabase: Supabase,
  project: string,
  key: string,
): Promise<unknown> {
  const { data } = await supabase
    .from("current_field_values")
    .select("value")
    .eq("project_id", project)
    .eq("deliverable", "strategy")
    .eq("field_key", key)
    .maybeSingle();
  return data?.value ?? null;
}

function row(
  organizationId: string,
  project: string,
  key: string,
  value: unknown,
  status: "confirmed" | "proposed" | "rejected",
  sourceType: "manual" | "suggestion",
) {
  return {
    organization_id: organizationId,
    project_id: project,
    deliverable: "strategy",
    field_key: key,
    value: value as never,
    status,
    source_type: sourceType,
  };
}

/**
 * The owner's answer to one question: the checked choices and the text of the
 * field (composed from the choices, then edited freely), saved together.
 */
export async function saveStrategyAnswer(
  project: string,
  target: StrategyTextField,
  value: ChoiceValue,
  text: string,
): Promise<ActionResult> {
  const organizationId = await orgId();
  const answer = z.string().trim().max(2000).safeParse(text);
  if (
    !projectId.safeParse(project).success ||
    !field.safeParse(target).success ||
    !organizationId ||
    !answer.success
  )
    return fail("invalid_input");
  const clean = toChoiceValue(target, value);
  if (clean.other && clean.other.length > 300) return fail("invalid_input");

  const supabase = await createClient();
  const rows = [
    row(
      organizationId,
      project,
      choicesKey(target),
      clean,
      "confirmed",
      "manual",
    ),
  ];
  // The text is written only when there is one and it changed.
  const currentText = await current(supabase, project, target);
  if (answer.data && answer.data !== currentText) {
    rows.push(
      row(organizationId, project, target, answer.data, "confirmed", "manual"),
    );
  }
  const { error } = await supabase.from("field_values").insert(rows);
  return done(project, error);
}

/**
 * Accepts pre-checked answers (all of them when `choices` is null): they join
 * the confirmed choices and leave the suggestions.
 */
export async function acceptStrategySuggestions(
  project: string,
  target: StrategyTextField,
  choices: string[] | null,
): Promise<ActionResult> {
  return resolveSuggestions(project, target, choices, true);
}

/** Dismisses one pre-checked answer: it leaves the suggestions, unchosen. */
export async function dismissStrategySuggestion(
  project: string,
  target: StrategyTextField,
  choice: string,
): Promise<ActionResult> {
  return resolveSuggestions(project, target, [choice], false);
}

async function resolveSuggestions(
  project: string,
  target: StrategyTextField,
  choices: string[] | null,
  accept: boolean,
): Promise<ActionResult> {
  const organizationId = await orgId();
  if (
    !projectId.safeParse(project).success ||
    !field.safeParse(target).success ||
    !organizationId ||
    (choices !== null && !choices.every((c) => isChoiceOf(target, c)))
  )
    return fail("invalid_input");

  const supabase = await createClient();
  const suggestions = toSuggestions(
    target,
    await current(supabase, project, suggestionsKey(target)),
  );
  const picked = new Set(choices ?? suggestions.map((s) => s.choice));
  const remaining = suggestions.filter((s) => !picked.has(s.choice));

  const rows = [
    row(
      organizationId,
      project,
      suggestionsKey(target),
      { items: remaining },
      remaining.length ? "proposed" : "rejected",
      "suggestion",
    ),
  ];
  if (accept) {
    const chosen = toChoiceValue(
      target,
      await current(supabase, project, choicesKey(target)),
    );
    rows.push(
      row(
        organizationId,
        project,
        choicesKey(target),
        { ...chosen, choices: [...new Set([...chosen.choices, ...picked])] },
        "confirmed",
        "manual",
      ),
    );
  }
  const { error } = await supabase.from("field_values").insert(rows);
  return done(project, error);
}

export type ProposeResult =
  | { ok: true; count: number }
  | {
      ok: false;
      error: "no_sources" | "provider" | "stage_locked" | "generic";
    }
  | ProviderFailure;

/**
 * Pre-checks the three questions from the Brief and the call reports. Stores
 * only verified suggestions, and never an answer already chosen.
 */
export async function proposeStrategyChoices(
  project: string,
): Promise<ProposeResult> {
  const organizationId = await orgId();
  if (!projectId.safeParse(project).success || !organizationId)
    return { ok: false, error: "generic" };

  // Checked before the paid provider call: owner, strategy in progress.
  const supabase = await createClient();
  const { data: editable } = await supabase.rpc("strategy_is_editable", {
    p_project_id: project,
  });
  if (!editable) return { ok: false, error: "stage_locked" };

  const result = await suggestStrategyChoices(project);
  if (!result.ok) return result;

  const rows = [];
  let count = 0;
  for (const target of STRATEGY_TEXT_FIELDS) {
    const chosen = toChoiceValue(
      target,
      await current(supabase, project, choicesKey(target)),
    );
    const fresh: ChoiceSuggestion[] = result.suggestions[target].filter(
      (s) => !chosen.choices.includes(s.choice),
    );
    count += fresh.length;
    rows.push(
      row(
        organizationId,
        project,
        suggestionsKey(target),
        { items: fresh },
        fresh.length ? "proposed" : "rejected",
        "suggestion",
      ),
    );
  }
  const { error } = await supabase.from("field_values").insert(rows);
  const saved = await done(project, error);
  if (!saved.ok)
    return {
      ok: false,
      error: saved.error === "stage_locked" ? "stage_locked" : "generic",
    };
  return { ok: true, count };
}
