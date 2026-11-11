"use server";

import { revalidatePath } from "next/cache";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { databaseErrorMessage } from "@/lib/auth/errors";
import { routes } from "@/lib/auth/redirects";
import { parseForm, retainedValues } from "@/lib/auth/schemas";
import { fr } from "@/lib/i18n/fr";
import {
  collectiveError,
  foreignKeyError,
  shapeError,
} from "@/lib/projects/errors";
import { updateProjectSchema } from "@/lib/projects/schemas";
import { projectTitleLabel } from "@/lib/projects/title-rules";
import type { CreateProjectState } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// The titles where an artist takes part in the project (a participation
// neither declined nor withdrawn, the rule of set_project_main_artist), in
// their order, named as the project names them. Read under RLS; none read:
// the message says it in general.
async function guestTitles(
  supabase: Supabase,
  projectId: string,
  artistId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("title_participations")
    .select(
      "title:project_titles!title_participations_title(position, working_title, link:project_masters!project_titles_link(master:masters!project_masters_master_same_org(title)))",
    )
    .eq("project_id", projectId)
    .eq("artist_id", artistId)
    .not("status", "in", "(declined,withdrawn)");
  if (error) {
    console.error("guestTitles:", error.message);
    return [];
  }
  return (data ?? [])
    .flatMap((row) => (row.title ? [row.title] : []))
    .sort((a, b) => a.position - b.position)
    .map((title) =>
      projectTitleLabel({
        position: title.position,
        workingTitle: title.working_title,
        masterTitle: title.link?.master?.title ?? null,
      }),
    );
}

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
    // A collective's main artist (lot 5 of docs/pds-mic-plan.md): changed
    // through set_project_main_artist by update_project, never erased.
    p_artist_id:
      (input.collective ? input.mainArtistId : input.artistId) ?? undefined,
  });

  if (error) {
    const pe = fr.shell.newProject.errors;
    const shape = shapeError(error.message);
    if (shape) return { status: "error", ...shape, values };
    // The main artist takes part in titles of the project: named.
    if (
      input.collective &&
      input.mainArtistId &&
      error.message.includes("main_artist_is_guest")
    ) {
      const titles = await guestTitles(
        supabase,
        input.projectId,
        input.mainArtistId,
      );
      return {
        status: "error",
        fieldErrors: { mainArtistId: pe.mainArtistIsGuest(titles) },
        values,
      };
    }
    const collective = input.collective ? collectiveError(error) : null;
    if (collective?.fieldErrors)
      return { status: "error", fieldErrors: collective.fieldErrors, values };
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
