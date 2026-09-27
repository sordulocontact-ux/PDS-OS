import "server-only";

import type { ProjectFormDefaults } from "@/components/projects/create-project-form";
import type { FormValues } from "@/lib/auth/form-state";
import { isPriority, isProjectType } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Fields of the "Nouveau projet" form kept in a draft, with their length
// limit (the form's own, plus room for the JSON lists of ids).
export const DRAFT_FIELDS = {
  title: 200,
  type: 40,
  masterIds: 8000,
  assigneePersonId: 40,
  creativePersonIds: 8000,
  dueDate: 20,
  budget: 20,
  priority: 20,
  framingNotes: 20000,
} as const;

// Drafts listed on the new project page, most recent first.
const MAX_LISTED = 20;

export type ProjectDraftItem = { id: string; title: string; updatedAt: string };

/** Only the form's fields, as text, within their limits. */
export function draftValues(input: unknown): FormValues {
  const values: FormValues = {};
  if (!input || typeof input !== "object") return values;
  for (const [field, max] of Object.entries(DRAFT_FIELDS)) {
    const value = (input as Record<string, unknown>)[field];
    if (typeof value === "string" && value !== "")
      values[field] = value.slice(0, max);
  }
  return values;
}

/** The viewer's own drafts (RLS: a draft is only its author's). */
export async function listProjectDrafts(): Promise<ProjectDraftItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_drafts")
    .select("id, form_values, updated_at")
    .order("updated_at", { ascending: false })
    .limit(MAX_LISTED);
  if (error) {
    console.error("listProjectDrafts:", error.message);
    return [];
  }
  return data.map((draft) => ({
    id: draft.id,
    title: draftValues(draft.form_values).title?.trim() ?? "",
    updatedAt: draft.updated_at,
  }));
}

export async function getProjectDraft(id: string): Promise<FormValues | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_drafts")
    .select("form_values")
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("getProjectDraft:", error.message);
  return data ? draftValues(data.form_values) : null;
}

// A JSON list of ids, as the form's hidden inputs write it.
function idsOf(raw: string | undefined): string[] {
  try {
    const value: unknown = JSON.parse(raw || "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

/** The form's starting values from a draft; the rest is checked on creation. */
export function draftDefaults(values: FormValues): ProjectFormDefaults {
  return {
    title: values.title ?? "",
    type: isProjectType(values.type) ? values.type : null,
    masterIds: idsOf(values.masterIds),
    assigneePersonId: values.assigneePersonId ?? null,
    creativePersonIds: idsOf(values.creativePersonIds),
    dueDate: values.dueDate,
    budget: values.budget,
    priority: isPriority(values.priority) ? values.priority : null,
    framingNotes: values.framingNotes,
  };
}
