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
import {
  collectiveError,
  foreignKeyError,
  shapeError,
} from "@/lib/projects/errors";
import { createProjectSchema } from "@/lib/projects/schemas";
import type { CreateProjectState } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Creates a project in one database call, with the user's session: RLS
// (create_projects) and column grants apply. Masters are linked, the project
// is transmitted to its manager and the creative directors are attached in
// the same transaction. No stage, no owner until acceptance. A collective
// (lot 5 of docs/pds-mic-plan.md) goes through create_collective_project:
// its main artist, a selection's artists copied as titles and
// participations; also open to the selection's holder who manages the
// Catalogue (the database decides), who then runs it, launched at once.
export async function createProject(
  _previous: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const access = await requireApproved();
  const fromSelection =
    formData.get("collective") === "on" && Boolean(formData.get("selectionId"));
  if (
    !access.organizationId ||
    !(
      can(access, "create_projects") ||
      (fromSelection && can(access, "manage_catalog"))
    )
  ) {
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
  if (!can(access, "create_projects") && !input.selectionId) {
    return {
      status: "error",
      fieldErrors: {
        selectionId: fr.shell.newProject.errors.selectionRequired,
      },
      values,
    };
  }

  const supabase = await createClient();
  const common = {
    p_organization_id: access.organizationId,
    p_title: input.title,
    p_type: input.type,
    p_master_ids: input.masterIds,
    p_due_date: input.dueDate ?? undefined,
    p_budget_cents: input.budget ?? undefined,
    p_priority: input.priority ?? undefined,
    p_initial_context: input.initialContext ?? undefined,
    p_creative_person_ids: input.creativePersonIds,
    p_music_format: input.musicFormat ?? undefined,
    p_content_format_id: input.contentFormatId ?? undefined,
    p_master_validator_person_id: input.masterValidatorPersonId ?? undefined,
  };
  const { data: projectId, error } =
    input.collective && input.mainArtistId
      ? await supabase.rpc("create_collective_project", {
          ...common,
          p_main_artist_id: input.mainArtistId,
          p_assignee_person_id: input.assigneePersonId,
          p_selection_id: input.selectionId ?? undefined,
        })
      : await supabase.rpc("create_project", {
          ...common,
          p_assignee_person_id: input.assigneePersonId,
          p_artist_id: input.artistId ?? undefined,
        });

  if (error || !projectId) {
    const pe = fr.shell.newProject.errors;
    const shape = shapeError(error?.message);
    if (shape) return { status: "error", ...shape, values };
    const collective = input.collective ? collectiveError(error) : null;
    if (collective) return { status: "error", ...collective, values };
    if (error?.message.includes("invalid_assignee")) {
      return {
        status: "error",
        fieldErrors: { assigneePersonId: pe.invalidManager },
        values,
      };
    }
    if (error?.message.includes("invalid_master_validator")) {
      return {
        status: "error",
        fieldErrors: { masterValidatorPersonId: pe.invalidMasterValidator },
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
    // Foreign key: a linked master, format or artist no longer exists.
    if (error?.code === "23503") {
      return { status: "error", fieldErrors: foreignKeyError(error), values };
    }
    console.error("createProject:", error?.message);
    return { status: "error", formError: databaseErrorMessage(error), values };
  }

  // The draft it was typed in is done with (RLS: only the author's).
  const draftId = formData.get("draftId");
  if (typeof draftId === "string" && draftId) {
    const { error: draftError } = await supabase
      .from("project_drafts")
      .delete()
      .eq("id", draftId);
    if (draftError) console.error("createProject:", draftError.message);
  }

  // The manager and the creative directors are notified by database triggers.
  await schedulePendingPushes();
  // Projects list and the "Projets liés" block of each linked master.
  revalidatePath(routes.app, "layout");
  // From a side panel (a PO draft), the page behind stays; with a cover,
  // the form files it before opening the project (CreateProjectForm).
  const intent = formData.get("intent");
  if (intent === "dialog" || intent === "cover") {
    return { status: "saved", project: { id: projectId, title: input.title } };
  }
  redirect(routes.project(projectId));
}
