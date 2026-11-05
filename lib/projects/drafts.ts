import "server-only";

import type { ProjectFormDefaults } from "@/components/projects/create-project-form";
import type { FormValues } from "@/lib/auth/form-state";
import { listContentFormats } from "@/lib/projects/content-formats";
import type { ProjectKind } from "@/lib/projects/labels";
import {
  isContentMode,
  isMusicFormat,
  isPriority,
  isProjectType,
} from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Fields of the "Nouveau projet" form kept in a draft, with their length
// limit (the form's own, plus room for the JSON lists of ids).
export const DRAFT_FIELDS = {
  title: 200,
  type: 40,
  musicFormat: 20,
  contentMode: 20,
  contentFormatId: 40,
  artistId: 40,
  masterIds: 8000,
  assigneePersonId: 40,
  creativePersonIds: 8000,
  masterValidatorPersonId: 40,
  dueDate: 20,
  budget: 20,
  priority: 20,
  initialContext: 20000,
  // Drafts typed before the field was renamed (feedback n°2).
  framingNotes: 20000,
} as const;

// Drafts listed at the top of the projects list, most recent first.
const MAX_LISTED = 20;

export type ProjectDraftItem = {
  id: string;
  title: string;
  // As the project will read; null before a type is chosen.
  kind: ProjectKind | null;
};

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
    .select("id, form_values")
    .order("updated_at", { ascending: false })
    .limit(MAX_LISTED);
  if (error) {
    console.error("listProjectDrafts:", error.message);
    return [];
  }
  const drafts = data.map((draft) => ({
    id: draft.id,
    values: draftDefaults(draftValues(draft.form_values)),
  }));
  // Format names only when a draft names one (RLS: every member reads them).
  const formats = drafts.some((d) => d.values.contentFormatId)
    ? new Map((await listContentFormats()).map((f) => [f.id, f.name]))
    : new Map<string, string>();
  return drafts.map(({ id, values }) => ({
    id,
    title: values.title.trim(),
    kind: values.type
      ? {
          type: values.type,
          musicFormat: values.musicFormat ?? null,
          contentFormatName:
            values.contentMode === "format" && values.contentFormatId
              ? (formats.get(values.contentFormatId) ?? null)
              : null,
        }
      : null,
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
    musicFormat: isMusicFormat(values.musicFormat) ? values.musicFormat : null,
    contentMode: isContentMode(values.contentMode) ? values.contentMode : null,
    contentFormatId: values.contentFormatId ?? null,
    artistId: values.artistId ?? null,
    masterIds: idsOf(values.masterIds),
    assigneePersonId: values.assigneePersonId ?? null,
    creativePersonIds: idsOf(values.creativePersonIds),
    masterValidatorPersonId: values.masterValidatorPersonId ?? null,
    dueDate: values.dueDate,
    budget: values.budget,
    priority: isPriority(values.priority) ? values.priority : null,
    initialContext: values.initialContext ?? values.framingNotes,
  };
}
