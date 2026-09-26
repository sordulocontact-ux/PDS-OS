"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { databaseErrorMessage } from "@/lib/auth/errors";
import { routes } from "@/lib/auth/redirects";
import { parseForm, retainedValues } from "@/lib/auth/schemas";
import { fr } from "@/lib/i18n/fr";
import { createProjectSchema } from "@/lib/projects/schemas";
import type { CreateProjectState } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Creates a project and links its masters in one database call
// (create_project), with the user's session: RLS (create_projects) and column
// grants apply. No stage, no owner: the project waits to be handed over.
export async function createProject(
  _previous: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const access = await requireApproved();
  if (!access.organizationId || !can(access, "create_projects")) {
    return { status: "error", formError: fr.auth.errors.forbidden };
  }

  const values = retainedValues(formData);
  const parsed = parseForm(createProjectSchema, formData);
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
  const { data: projectId, error } = await supabase.rpc("create_project", {
    p_organization_id: access.organizationId,
    p_title: input.title,
    p_type: input.type,
    p_master_ids: input.masterIds,
    p_due_date: input.dueDate ?? undefined,
    p_budget_cents: input.budget ?? undefined,
    p_priority: input.priority ?? undefined,
    p_framing_notes: input.framingNotes ?? undefined,
  });

  if (error || !projectId) {
    const pe = fr.shell.newProject.errors;
    if (error?.message.includes("music_release_requires_master")) {
      return {
        status: "error",
        fieldErrors: { masterIds: pe.mastersRequired },
        values,
      };
    }
    // Foreign key: a linked master no longer exists (or is out of reach).
    if (error?.code === "23503") {
      return {
        status: "error",
        fieldErrors: { masterIds: pe.invalidMasters },
        values,
      };
    }
    console.error("createProject:", error?.message);
    return { status: "error", formError: databaseErrorMessage(error), values };
  }

  // Projects list and the "Projets liés" block of each linked master.
  revalidatePath(routes.app, "layout");
  redirect(routes.project(projectId));
}
