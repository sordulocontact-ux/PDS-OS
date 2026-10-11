import "server-only";

import { cache } from "react";

import type { Access } from "@/lib/auth/access";
import { canEditProject } from "@/lib/projects/edit-access";
import { createClient } from "@/lib/supabase/server";

// What the screen offers on an activation. Same rules as the database
// (activation_can_write, marketing_can_validate), which enforces them; this
// copy only decides which controls show.

/** The project's owner, or the activation's own owner. */
export function canWriteActivation(
  access: Access,
  project: { ownerPersonId: string | null },
  activation: { ownerPersonId: string | null; status: string },
): boolean {
  if (activation.status === "closed") return false;
  return (
    canEditProject(access, project) ||
    (access.personId !== null && activation.ownerPersonId === access.personId)
  );
}

/** « Validateur PDS » : the director or a creative director of the project,
 * read from the database once per request. */
export const canValidateMarketing = cache(
  async (projectId: string): Promise<boolean> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("marketing_can_validate", {
      p_project_id: projectId,
    });
    if (error) console.error("canValidateMarketing:", error.message);
    return data === true;
  },
);
