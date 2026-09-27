"use server";

import { z } from "zod";

import { done, id, orgId } from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import type { ObjectiveSuggestion } from "@/lib/framing/suggest-objective";
import { suggestFramingObjective } from "@/lib/framing/suggest-objective";
import { createClient } from "@/lib/supabase/server";

const SUGGESTIONS_KEY = "objective_suggestions";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function currentSuggestions(
  supabase: Supabase,
  projectId: string,
): Promise<ObjectiveSuggestion[]> {
  const { data } = await supabase
    .from("current_field_values")
    .select("value")
    .eq("project_id", projectId)
    .eq("deliverable", "brief")
    .eq("field_key", SUGGESTIONS_KEY)
    .maybeSingle();
  const items = (data?.value as { items?: unknown } | null)?.items;
  return Array.isArray(items) ? (items as ObjectiveSuggestion[]) : [];
}

async function writeSuggestions(
  supabase: Supabase,
  organizationId: string,
  projectId: string,
  items: ObjectiveSuggestion[],
) {
  return supabase.from("field_values").insert({
    organization_id: organizationId,
    project_id: projectId,
    deliverable: "brief",
    field_key: SUGGESTIONS_KEY,
    value: { items } as never,
    status: items.length ? "proposed" : "rejected",
    source_type: "suggestion",
  });
}

export type ProposeObjectiveResult =
  | { ok: true; count: number }
  | {
      ok: false;
      error: "no_sources" | "provider" | "stage_locked" | "generic";
    };

/** Suggests up to four objective rephrasings, sourced from the Brief and calls. */
export async function proposeObjectiveChoices(
  projectId: string,
): Promise<ProposeObjectiveResult> {
  const organizationId = await orgId();
  if (!id.safeParse(projectId).success || !organizationId)
    return { ok: false, error: "generic" };

  const result = await suggestFramingObjective(projectId);
  if (!result.ok) return result;

  const supabase = await createClient();
  const existing = await currentSuggestions(supabase, projectId);
  const seen = new Set(existing.map((s) => s.text.toLowerCase()));
  const fresh = result.suggestions.filter(
    (s) => !seen.has(s.text.toLowerCase()),
  );

  const { error } = await writeSuggestions(
    supabase,
    organizationId,
    projectId,
    [...existing, ...fresh],
  );
  const saved = await done(projectId, error);
  if (!saved.ok)
    return {
      ok: false,
      error: saved.error === "stage_locked" ? "stage_locked" : "generic",
    };
  return { ok: true, count: fresh.length };
}

/**
 * Makes one of PO's suggestions the confirmed objective. The text is taken
 * from the stored suggestion, never from the client, and keeps its call
 * source when it came from a call item.
 */
export async function chooseObjective(
  projectId: string,
  suggestionText: string,
): Promise<ActionResult> {
  const organizationId = await orgId();
  if (!id.safeParse(projectId).success || !organizationId)
    return fail("invalid_input");
  const supabase = await createClient();
  const suggestion = (await currentSuggestions(supabase, projectId)).find(
    (s) => s.text === suggestionText,
  );
  if (!suggestion) return fail("not_found");

  const itemId = suggestion.source.startsWith("item:")
    ? suggestion.source.slice("item:".length)
    : null;
  const fromCall = itemId !== null && id.safeParse(itemId).success;
  const { error } = await supabase.from("field_values").insert({
    organization_id: organizationId,
    project_id: projectId,
    deliverable: "brief",
    field_key: "objective",
    value: suggestion.text,
    status: "confirmed",
    source_type: fromCall ? "call" : "manual",
    source_report_item_id: fromCall ? itemId : null,
    source_quote: fromCall ? suggestion.quote : null,
  });
  return done(projectId, error);
}

/** Removes one suggestion from the list: chosen (applied elsewhere) or dismissed. */
export async function dismissObjectiveSuggestion(
  projectId: string,
  text: string,
): Promise<ActionResult> {
  const parsed = z.string().min(1).safeParse(text);
  const organizationId = await orgId();
  if (!parsed.success || !id.safeParse(projectId).success || !organizationId)
    return fail("invalid_input");

  const supabase = await createClient();
  const existing = await currentSuggestions(supabase, projectId);
  const remaining = existing.filter((s) => s.text !== parsed.data);
  const { error } = await writeSuggestions(
    supabase,
    organizationId,
    projectId,
    remaining,
  );
  return done(projectId, error);
}
