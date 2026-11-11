"use server";

import { revalidatePath } from "next/cache";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { databaseErrorMessage } from "@/lib/auth/errors";
import { routes } from "@/lib/auth/redirects";
import { parseForm, retainedValues } from "@/lib/auth/schemas";
import { fr } from "@/lib/i18n/fr";
import { foreignKeyError, shapeError } from "@/lib/projects/errors";
import { updateProjectSchema } from "@/lib/projects/schemas";
import type { CreateProjectState } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Edits a project before its launch (update_project), with the user's
// session: RLS decides (create_projects, project visible, no stage yet).
// Once launched, the project is written through its stages by its owner.
export async function updateProject(
  _previous: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const access = await requireApproved();
  if (!access.organizationId || !can(access, "create_projects")) {
    return { status: "error", formError: fr.auth.errors.forbidden };
  }

  const values = retainedValues(formData);
  const parsed = parseForm(updateProjectSchema, formData);
  if (!parsed.ok) {
    return {
      status: "error",
      fieldErrors: parsed.fieldErrors,
      formError: parsed.formError,
      values,
    };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_project", {
    p_project_id: input.projectId,
    p_title: input.title,
    p_type: input.type,
    p_master_ids: input.masterIds,
    p_due_date: input.dueDate ?? undefined,
    p_budget_cents: input.budget ?? undefined,
    p_priority: input.priority ?? undefined,
    p_initial_context: input.initialContext ?? undefined,
    p_music_format: input.musicFormat ?? undefined,
    p_content_format_id: input.contentFormatId ?? undefined,
    p_artist_id: input.artistId ?? undefined,
  });

  if (error) {
    const pe = fr.shell.newProject.errors;
    const shape = shapeError(error.message);
    if (shape) return { status: "error", ...shape, values };
    // A collective's titles are abandoned, never unlinked (lot 2 of
    // docs/pds-mic-plan.md).
    if (error.message.includes("collective_title_kept")) {
      return {
        status: "error",
        fieldErrors: { masterIds: fr.projectTitles.errors.keptInProject },
        values,
      };
    }
    if (error.message.includes("project_not_editable")) {
      return { status: "error", formError: pe.notEditable, values };
    }
    if (error.code === "23503") {
      return { status: "error", fieldErrors: foreignKeyError(error), values };
    }
    console.error("updateProject:", error.message);
    return { status: "error", formError: databaseErrorMessage(error), values };
  }

  revalidatePath(routes.app, "layout");
  return {
    status: "saved",
    project: { id: input.projectId, title: input.title },
  };
}
