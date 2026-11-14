"use server";

import { revalidatePath } from "next/cache";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  dossierParamsSchema,
  type DossierParamsInput,
} from "@/lib/distribution/dossier";
import type { DistributionResult } from "@/lib/distribution/result";
import { fr } from "@/lib/i18n/fr";
import { inScope } from "@/lib/distribution/scope";
import { createClient } from "@/lib/supabase/server";

const e = fr.distribution.dossier.errors;

/** A database refusal of the dossier, in words. */
function failure(error: {
  code?: string;
  message?: string;
}): DistributionResult {
  const message = error.message ?? "";
  if (error.code === "42501") return { ok: false, error: e.forbidden };
  if (message.includes("cover_not_in_project"))
    return { ok: false, error: e.cover };
  if (error.code === "23514" || error.code === "22P02")
    return { ok: false, error: e.invalid };
  console.error("distribution dossier:", error.code, message);
  return { ok: false, error: e.generic };
}

/**
 * The distribution's own parameters (CA05). Written with the user's
 * session: only the project's owner passes the RLS. Nothing is sent to
 * the distributor.
 */
export async function saveDossierParams(
  input: DossierParamsInput,
): Promise<DistributionResult> {
  await requireApproved();
  const parsed = dossierParamsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const { projectId, releaseId, ...params } = parsed.data;
  const supabase = await createClient();
  const [project, existing] = await Promise.all([
    supabase
      .from("projects")
      .select("organization_id")
      .eq("id", projectId)
      .maybeSingle(),
    inScope(
      supabase
        .from("distribution_dossiers")
        .select("id")
        .eq("project_id", projectId),
      releaseId ?? null,
    ).maybeSingle(),
  ]);
  if (!project.data) return { ok: false, error: e.generic };
  const row = {
    territory_mode: params.territoryMode,
    territories: params.territories,
    preorder: params.preorder,
    preorder_on: params.preorderOn,
    prelisten: params.prelisten,
    prelisten_on: params.prelistenOn,
    price_tier: params.priceTier,
    notes: params.notes,
    cover_sheet_id: params.coverSheetId,
  };
  // `select` returns the written row: a write the RLS filters out (not the
  // owner) writes nothing without an error, never « saved ».
  const { data, error } = existing.data
    ? await supabase
        .from("distribution_dossiers")
        .update(row)
        .eq("id", existing.data.id)
        .select("id")
    : await supabase
        .from("distribution_dossiers")
        .insert({
          ...row,
          organization_id: project.data.organization_id,
          project_id: projectId,
          release_id: releaseId ?? null,
        })
        .select("id");
  if (error) return failure(error);
  if (!data?.length) return { ok: false, error: e.forbidden };
  revalidatePath(routes.projectRelease(projectId), "layout");
  return { ok: true };
}
