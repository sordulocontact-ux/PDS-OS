"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import type { FormState } from "@/lib/auth/form-state";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

/**
 * « Commencer la stratégie »: the entry gives way to the work. Owner only,
 * once the Plan du Projet has started the stage; the database checks both
 * (start_strategy).
 */
// Used with useActionState: the previous state it passes is not needed.
export async function startStrategy(projectId: string): Promise<FormState> {
  const t = fr.strategyEntry.errors;
  if (!z.uuid().safeParse(projectId).success)
    return { status: "error", formError: t.generic };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_strategy", {
    p_project_id: projectId,
  });
  if (error) {
    console.error("startStrategy:", error.code, error.message);
    return {
      status: "error",
      formError:
        error.code === "42501"
          ? fr.framing.errors.forbidden
          : error.message.includes("plan_required")
            ? t.plan_required
            : t.generic,
    };
  }
  revalidatePath(routes.project(projectId), "layout");
  redirect(routes.projectStrategy(projectId));
}
