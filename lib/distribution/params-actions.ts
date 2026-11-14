"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { saveDossierParams } from "@/lib/distribution/actions";
import { PRICE_TIERS, TERRITORY_MODES } from "@/lib/distribution/dossier";
import { loadDistributionSources } from "@/lib/distribution/sources";
import { preorderProposal } from "@/lib/distribution/proposals";
import { loadValidators } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { distributionProject } from "@/lib/distribution/release-scope";
import { releaseArg } from "@/lib/distribution/scope";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/utils/day";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.distributionJourney.params;

const date = z.iso.date().nullable();
const patchSchema = z.object({
  projectId: z.uuid(),
  releaseId: z.uuid().nullable().optional(),
  patch: z
    .object({
      territoryMode: z.enum(TERRITORY_MODES),
      territories: z.array(z.string().length(2)).max(300),
      preorder: z.enum(["yes", "no"]),
      preorderOn: date,
      prelisten: z.enum(["yes", "no"]),
      prelistenOn: date,
      priceTier: z.enum(PRICE_TIERS),
      notes: z.string().max(2000),
      coverSheetId: z.uuid(),
    })
    .partial(),
});

/**
 * One parameter changed in place (« Modifier » on its row, VISION-UX rule
 * 2): merged into the saved parameters, refused when a pre-order or a
 * pre-listening would start on or after the release, then saved by the
 * owner's session (saveDossierParams, RLS). The toast says which one.
 */
export async function updateDistributionParams(
  input: z.input<typeof patchSchema>,
  done: string,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = patchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.errors.generic };
  const { projectId, releaseId, patch } = parsed.data;
  // A collective's abandoned titles leave the checks (lot 9); its
  // parameters are a release's (lot 15).
  const project = await distributionProject(projectId, releaseId);
  if (!project) return { ok: false, error: t.errors.generic };
  const { params } = await loadDistributionSources(project, access);
  const yes = (value: "yes" | "no" | undefined, current: boolean | null) =>
    value === undefined ? current : value === "yes";
  const preorder = yes(patch.preorder, params.preorder);
  const prelisten = yes(patch.prelisten, params.prelisten);
  const preorderOn = preorder
    ? patch.preorderOn !== undefined
      ? patch.preorderOn
      : params.preorderOn
    : null;
  const prelistenOn = prelisten
    ? patch.prelistenOn !== undefined
      ? patch.prelistenOn
      : params.prelistenOn
    : null;
  // A collective's release (lot 15): its own date.
  const release = project.distributionRelease
    ? project.distributionRelease.date
    : project.dueDate;
  if (release && preorderOn && preorderOn >= release)
    return { ok: false, error: t.errors.preorderLate(formatDay(release)) };
  if (release && prelistenOn && prelistenOn >= release)
    return { ok: false, error: t.errors.prelistenLate(formatDay(release)) };
  const mode = patch.territoryMode ?? params.territoryMode;
  const territories =
    mode === "world" ? [] : (patch.territories ?? params.territories);
  if (mode !== "world" && territories.length === 0)
    return { ok: false, error: t.errors.countries };
  const asYesNo = (value: boolean | null) =>
    value === null ? "" : value ? "yes" : "no";
  const result = await saveDossierParams({
    projectId,
    releaseId: releaseId ?? null,
    territoryMode: mode,
    territories,
    preorder: asYesNo(preorder),
    preorderOn: preorderOn ?? "",
    prelisten: asYesNo(prelisten),
    prelistenOn: prelistenOn ?? "",
    priceTier: patch.priceTier ?? params.priceTier ?? "",
    notes: patch.notes ?? params.notes ?? "",
    coverSheetId: patch.coverSheetId ?? params.coverSheetId ?? "",
  });
  if (!result.ok) return result;
  return { ok: true, done };
}

/**
 * « Confirmer les paramètres » in one gesture (proto step `params`): what
 * PDS OS proposed and nobody changed is written with the confirmation — the
 * validator (the direction, never the owner) and the pre-order read in the
 * Stratégie — then the database checks what is still missing.
 */
export async function confirmDistributionParams(input: {
  projectId: string;
  releaseId?: string | null;
}): Promise<WriteResult> {
  const access = await requireApproved();
  const projectId = z.uuid().safeParse(input.projectId);
  if (!projectId.success) return { ok: false, error: t.errors.generic };
  const releaseId = z.uuid().nullable().optional().safeParse(input.releaseId);
  if (!releaseId.success) return { ok: false, error: t.errors.generic };
  // A collective's abandoned titles leave the checks (lot 9); a release's
  // parameters (lot 15).
  const project = await distributionProject(projectId.data, releaseId.data);
  if (!project) return { ok: false, error: t.errors.generic };
  const [validators, preorder] = await Promise.all([
    access.organizationId
      ? loadValidators(access.organizationId)
      : Promise.resolve([]),
    preorderProposal(
      project.id,
      project.distributionRelease
        ? project.distributionRelease.date
        : project.dueDate,
    ),
  ]);
  const proposed =
    validators.find((v) => v.personId !== project.ownerPersonId) ?? null;
  return withOutcome(project.id, ["distribution"], t.confirmed, async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("confirm_distribution_params", {
      p_project_id: project.id,
      p_validator: proposed?.personId ?? null,
      p_preorder: preorder ? true : null,
      p_preorder_on: preorder?.date ?? null,
      ...releaseArg(releaseId.data),
    });
    if (error) {
      const message = error.message ?? "";
      if (message.includes("params_missing"))
        return {
          ok: false,
          error: t.missing(
            (error.details ?? "").split(",").filter(Boolean).length || 1,
          ),
        };
      if (message.includes("date_after_release"))
        return { ok: false, error: t.errors.afterRelease };
      if (message.includes("version_open"))
        return { ok: false, error: t.errors.frozen };
      console.error("confirmDistributionParams:", error.code, message);
      return { ok: false, error: t.errors.generic };
    }
    revalidatePath(routes.project(project.id), "layout");
    return { ok: true };
  });
}
