import "server-only";

import { cache } from "react";

import { canValidateMarketing } from "@/lib/activations/access";
import type { ActionPerson } from "@/lib/activations/journey";
import { requireApproved } from "@/lib/auth/dal";
import { listValidatorRows, loadMembers } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Who acts on a project's activations, for the person looking: the
 * members, the project's owner, the direction (who validates: the one
 * validator's name, else « La direction ») and the creative lead who
 * validates the creators' contents (the project's creative, else the
 * direction). `viewer` is true on the lines the viewer may act on: their
 * own, and every decision when they validate (marketing_can_validate).
 * Read once per request.
 */
export const loadActivationPeople = cache(async (projectId: string) => {
  const access = await requireApproved();
  const supabase = await createClient();
  const [project, members, canValidate, validators, creatives] =
    await Promise.all([
      getProject(projectId),
      loadMembers(access),
      canValidateMarketing(projectId),
      access.organizationId
        ? listValidatorRows(access.organizationId)
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("project_creatives")
        .select("person_id")
        .eq("project_id", projectId),
    ]);
  const viewerId = access.personId;
  const nameOf = (id: string | null) =>
    members.find((m) => m.personId === id)?.name ?? "—";
  const person = (id: string): ActionPerson => ({
    personId: id,
    name: nameOf(id),
    viaLink: false,
    viewer: id === viewerId,
  });
  const single = validators.data?.length === 1 ? validators.data[0] : null;
  const direction: ActionPerson = {
    personId: single?.person_id ?? null,
    name: single
      ? personName(single.first_name, single.last_name)
      : fr.activationJourney.direction,
    viaLink: false,
    viewer: canValidate,
  };
  const creativeId = creatives.data?.[0]?.person_id ?? null;
  const creative: ActionPerson = creativeId
    ? { ...person(creativeId), viewer: canValidate }
    : direction;
  const ownerId = project?.ownerPersonId ?? null;
  const projectOwner: ActionPerson = ownerId
    ? person(ownerId)
    : {
        personId: null,
        name: project?.ownerName ?? "—",
        viaLink: false,
        viewer: false,
      };
  return {
    viewerId,
    canValidate,
    members,
    person,
    projectOwner,
    direction,
    creative,
  };
});

export type ActivationPeople = Awaited<ReturnType<typeof loadActivationPeople>>;
