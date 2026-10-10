"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import type { FormState } from "@/lib/auth/form-state";
import { routes } from "@/lib/auth/redirects";
import { designError, refreshConception } from "@/lib/design/actions/shared";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

/**
 * « Commencer directement »: starts the Conception (its stage, if not yet)
 * and opens the direct work. Owner only, once the Stratégie is validated;
 * the database checks both (start_design).
 */
// Used with useActionState: the previous state it passes is not needed.
export async function startConception(projectId: string): Promise<FormState> {
  if (!z.uuid().safeParse(projectId).success)
    return { status: "error", formError: fr.conception.errors.generic };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_design", {
    p_project_id: projectId,
  });
  if (error) {
    console.error("startConception:", error.code, error.message);
    return { status: "error", formError: designError(error) };
  }
  refreshConception(projectId);
  // The layout's chevrons and dots follow the stage.
  redirect(routes.projectDesignWork(projectId));
}
