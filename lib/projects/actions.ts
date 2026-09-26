"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { databaseErrorMessage } from "@/lib/auth/errors";
import { routes } from "@/lib/auth/redirects";
import { parseForm, retainedValues } from "@/lib/auth/schemas";
import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createProjectSchema } from "@/lib/projects/schemas";
import type { CreateProjectState } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Creates a project in one database call (create_project), with the user's
// session: RLS (create_projects) and column grants apply. Masters are linked,
// the project is transmitted to its manager and the creative directors are
// attached in the same transaction. No stage, no owner until acceptance.
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
    p_assignee_person_id: input.assigneePersonId,
    p_creative_person_ids: input.creativePersonIds,
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
    if (error?.message.includes("invalid_assignee")) {
      return {
        status: "error",
        fieldErrors: { assigneePersonId: pe.invalidManager },
        values,
      };
    }
    if (error?.message.includes("invalid_creative")) {
      return {
        status: "error",
        fieldErrors: { creativePersonIds: pe.invalidCreatives },
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

  // The manager and the creative directors are notified by database triggers.
  await schedulePendingPushes();
  // Projects list and the "Projets liés" block of each linked master.
  revalidatePath(routes.app, "layout");
  // From a side panel (a PO draft), the page behind stays.
  if (formData.get("intent") === "dialog") {
    return { status: "saved", project: { id: projectId, title: input.title } };
  }
  redirect(routes.project(projectId));
}
