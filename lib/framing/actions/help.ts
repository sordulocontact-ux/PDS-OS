"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { isTextQuestion, type QuestionKey } from "@/lib/framing/dimensions";
import { helpWithQuestion, type HelpSuggestion } from "@/lib/framing/help";
import { fromDatabaseError, type ActionResult } from "@/lib/framing/result";
import { canEditProject } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

// « M'aider à définir » (docs/ARCHITECTURE.md § 6): PO's sourced
// formulations for one question, kept as a proposed Brief row
// (`<key>_suggestions`) until a person picks one or sets them aside.

type Supabase = Awaited<ReturnType<typeof createClient>>;
const suggestionsKey = (key: QuestionKey) => `${key}_suggestions`;

async function current(
  supabase: Supabase,
  projectId: string,
  key: QuestionKey,
): Promise<HelpSuggestion[]> {
  const { data } = await supabase
    .from("current_field_values")
    .select("value, status")
    .eq("project_id", projectId)
    .eq("deliverable", "brief")
    .eq("field_key", suggestionsKey(key))
    .maybeSingle();
  if (data?.status !== "proposed") return [];
  const items = (data.value as { items?: unknown } | null)?.items;
  return Array.isArray(items) ? (items as HelpSuggestion[]) : [];
}

async function write(
  supabase: Supabase,
  organizationId: string,
  projectId: string,
  key: QuestionKey,
  items: HelpSuggestion[],
) {
  return supabase.from("field_values").insert({
    organization_id: organizationId,
    project_id: projectId,
    deliverable: "brief",
    field_key: suggestionsKey(key),
    value: { items } as never,
    status: items.length ? "proposed" : "rejected",
    source_type: "suggestion",
  });
}

export type HelpActionResult =
  | { ok: true; count: number }
  | {
      ok: false;
      error:
        "no_sources" | "provider" | "stage_locked" | "forbidden" | "generic";
    };

export async function proposeHelp(
  projectId: string,
  key: string,
): Promise<HelpActionResult> {
  const access = await requireApproved();
  if (!z.uuid().safeParse(projectId).success || !isTextQuestion(key))
    return { ok: false, error: "generic" };
  const project = await getProject(projectId);
  if (!project || !access.organizationId)
    return { ok: false, error: "generic" };
  // Only the owner writes: refused before paying for a model.
  if (!canEditProject(access, project))
    return { ok: false, error: "forbidden" };

  const result = await helpWithQuestion(project, key);
  if (!result.ok) return result;
  const supabase = await createClient();
  const existing = await current(supabase, projectId, key);
  const seen = new Set(existing.map((s) => s.text.toLowerCase()));
  const fresh = result.suggestions.filter(
    (s) => !seen.has(s.text.toLowerCase()),
  );
  const { error } = await write(
    supabase,
    access.organizationId,
    projectId,
    key,
    [...existing, ...fresh],
  );
  if (error?.code === "42501") return { ok: false, error: "stage_locked" };
  if (error) return { ok: false, error: "generic" };
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true, count: fresh.length };
}

/**
 * One of PO's formulations becomes the answer. The text and its source are
 * read from the stored suggestion, never from the client: a call item keeps
 * its call, the initial context its quote.
 */
export async function chooseHelp(
  projectId: string,
  key: string,
  text: string,
  // The formulation as the person edited it before saving (PROJ-UX-04).
  edited?: string,
): Promise<ActionResult> {
  const access = await requireApproved();
  if (
    !z.uuid().safeParse(projectId).success ||
    !isTextQuestion(key) ||
    !access.organizationId
  )
    return { ok: false, error: "invalid_input" };
  const supabase = await createClient();
  const suggestions = await current(supabase, projectId, key);
  const chosen = suggestions.find((s) => s.text === text);
  if (!chosen) return { ok: false, error: "not_found" };

  const itemId = chosen.source.startsWith("item:")
    ? chosen.source.slice(5)
    : null;
  const fromCall = itemId !== null && z.uuid().safeParse(itemId).success;
  const fromContext = chosen.source === "context";
  const { error } = await supabase.from("field_values").insert({
    organization_id: access.organizationId,
    project_id: projectId,
    deliverable: "brief",
    field_key: key,
    value: edited?.trim() ? edited.trim().slice(0, 2000) : chosen.text,
    status: "confirmed",
    source_type: fromCall ? "call" : fromContext ? "import" : "manual",
    source_report_item_id: fromCall ? itemId : null,
    source_quote: fromCall || fromContext ? chosen.quote : null,
    source_label: fromContext ? chosen.sourceLabel : null,
  });
  if (error)
    return error.code === "42501"
      ? { ok: false, error: "stage_locked" }
      : fromDatabaseError(error);
  // The other formulations go with the choice.
  await write(supabase, access.organizationId, projectId, key, []);
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}

export async function dismissHelp(
  projectId: string,
  key: string,
): Promise<ActionResult> {
  const access = await requireApproved();
  if (
    !z.uuid().safeParse(projectId).success ||
    !isTextQuestion(key) ||
    !access.organizationId
  )
    return { ok: false, error: "invalid_input" };
  const supabase = await createClient();
  const { error } = await write(
    supabase,
    access.organizationId,
    projectId,
    key,
    [],
  );
  if (error) return fromDatabaseError(error);
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}
