"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireApproved } from "@/lib/auth/dal";
import { databaseErrorMessage } from "@/lib/auth/errors";
import { routes } from "@/lib/auth/redirects";
import { parseForm, retainedValues } from "@/lib/auth/schemas";
import { fr } from "@/lib/i18n/fr";
import { listOwnerCandidates } from "@/lib/projects/queries";
import { createProjectSchema } from "@/lib/projects/schemas";
import type { CreateProjectState } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Creates a project (and its artist when typed as a new name) with the
// user's session: RLS and column grants apply, authorship and the seven
// stage rows are set by database triggers.
export async function createProject(
  _previous: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const access = await requireApproved();
  const organizationId = access.organizationId;
  if (!organizationId) {
    return { status: "error", formError: fr.auth.errors.forbidden };
  }

  const parsed = parseForm(createProjectSchema, formData);
  if (!parsed.ok) {
    return {
      status: "error",
      fieldErrors: parsed.fieldErrors,
      formError: parsed.formError,
      values: parsed.values,
    };
  }
  const input = parsed.data;
  const values = retainedValues(formData);

  const owners = await listOwnerCandidates();
  if (!owners.some((owner) => owner.personId === input.ownerPersonId)) {
    return {
      status: "error",
      fieldErrors: { ownerPersonId: fr.shell.newProject.errors.ownerInvalid },
      values,
    };
  }

  const supabase = await createClient();

  let artistId = input.artistMode === "existing" ? input.artistId : null;
  if (input.artistMode === "new") {
    const { data, error } = await supabase
      .from("artists")
      .insert({ organization_id: organizationId, name: input.artistName })
      .select("id")
      .single();
    if (error || !data) {
      console.error("createProject/artist:", error?.message);
      return {
        status: "error",
        formError: databaseErrorMessage(error),
        values,
      };
    }
    artistId = data.id;
  }
  if (!artistId) {
    return {
      status: "error",
      fieldErrors: { artistId: fr.shell.newProject.errors.artistRequired },
      values,
    };
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      organization_id: organizationId,
      artist_id: artistId,
      title: input.title,
      release_type: input.releaseType,
      owner_person_id: input.ownerPersonId,
    })
    .select("id")
    .single();

  if (error || !project) {
    console.error("createProject:", error?.message);
    return { status: "error", formError: databaseErrorMessage(error), values };
  }

  revalidatePath(routes.projects);
  redirect(routes.project(project.id));
}
