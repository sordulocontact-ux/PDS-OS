"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { BRIEF_DELIVERABLES } from "@/lib/master-workflow/brief-types";
import { createClient } from "@/lib/supabase/server";

export type FinalResult = { ok: true } | { ok: false; error: string };

/** Checks off (or back) a deliverable of a title as received: the owner
 * only (RLS); the masters themselves are refused in SQL. */
export async function setDeliverableReceived(
  projectId: string,
  masterId: string,
  deliverable: string,
  received: boolean,
): Promise<FinalResult> {
  const t = fr.masterWorkflow.final.errors;
  const input = z
    .object({
      projectId: z.uuid(),
      masterId: z.uuid(),
      deliverable: z.enum(BRIEF_DELIVERABLES),
      received: z.boolean(),
    })
    .safeParse({ projectId, masterId, deliverable, received });
  const access = await requireApproved();
  if (!input.success || !access.organizationId)
    return { ok: false, error: t.failed };
  const supabase = await createClient();
  const { projectId: project, masterId: master } = input.data;
  const { error } = input.data.received
    ? await supabase.from("master_deliverables_received").insert({
        organization_id: access.organizationId,
        project_id: project,
        master_id: master,
        deliverable: input.data.deliverable,
      })
    : await supabase
        .from("master_deliverables_received")
        .delete()
        .eq("project_id", project)
        .eq("master_id", master)
        .eq("deliverable", input.data.deliverable);
  if (error && error.code !== "23505") {
    console.error("setDeliverableReceived:", error.code, error.message);
    return {
      ok: false,
      error: error.code === "42501" ? t.forbidden : t.failed,
    };
  }
  revalidatePath(routes.projectMasterStep(project, "final"));
  return { ok: true };
}
