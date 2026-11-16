"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/auth/site-url";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import {
  buildTitlePlan,
  sourcesFor,
  visualsUsed,
} from "@/lib/projects/title-plan/build";
import {
  TITLE_PLAN_STATUSES,
  titlePlanPatchSchema,
} from "@/lib/projects/title-plan/model";
import { loadTitlePlan } from "@/lib/projects/title-plan/queries";
import type { DocImage } from "@/lib/strategy/documents/release-plan-model";
import { publishVisuals } from "@/lib/strategy/documents/visuals";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// A title's Plan de sortie (lot 14). Every write goes through the user's
// session: the database functions decide who (the project's owner) and
// which status may follow which.

const t = fr.titleReleasePlans.errors;
const id = z.uuid();
const status = z.enum(TITLE_PLAN_STATUSES);
const note = z.string().trim().max(1000).optional();

const CODES = [
  "status_changed",
  "no_target_date",
  "not_provisional",
  "plan_archived",
  "note_required",
  "title_abandoned",
  "not_shareable",
  "no_link",
  "too_large",
] as const;

function failure(error: { code?: string; message: string }, where: string) {
  if (error.code === "42501")
    return { ok: false as const, error: fr.auth.errors.forbidden };
  for (const code of CODES)
    if (error.message.includes(code))
      return { ok: false as const, error: t[code] };
  if (error.message.includes("invalid_input"))
    return { ok: false as const, error: t.invalid };
  console.error(`${where}:`, error.message);
  return { ok: false as const, error: t.failed };
}

const refresh = (projectId: string) =>
  revalidatePath(routes.projectReleasePlans(projectId), "layout");

/** One part of the draft (a dialog's), merged by the database. */
export async function saveTitlePlan(
  projectId: string,
  planId: string,
  patch: unknown,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = titlePlanPatchSchema.safeParse(patch);
  if (!id.safeParse(projectId).success || !id.safeParse(planId).success)
    return { ok: false, error: t.failed };
  if (!parsed.success) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_title_release_plan", {
    p_plan_id: planId,
    p_patch: parsed.data,
  });
  if (error) return failure(error, "saveTitlePlan");
  refresh(projectId);
  return { ok: true };
}

/** A status chosen (planning provisoire, prêt à partager, actif, archivé,
 * rouvert); `from`: the status the person saw. */
export async function setTitlePlanStatus(
  projectId: string,
  planId: string,
  from: string,
  to: string,
  text?: string,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({ projectId: id, planId: id, from: status, to: status, note })
    .safeParse({ projectId, planId, from, to, note: text });
  if (!parsed.success) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_title_release_plan_status", {
    p_plan_id: parsed.data.planId,
    p_from: parsed.data.from,
    p_to: parsed.data.to,
    p_note: parsed.data.note ?? undefined,
  });
  if (error) return failure(error, "setTitlePlanStatus");
  refresh(parsed.data.projectId);
  return { ok: true };
}

/**
 * « Enregistrer la version interne / une version révisée »: the server reads
 * the plan again (nothing comes from the browser but the note), publishes
 * the images it shows, builds the document and records it as the next
 * version, with the actions it read.
 */
export async function recordTitlePlanVersion(
  projectId: string,
  titleId: string,
  from: string,
  text?: string,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = z
    .object({ projectId: id, titleId: id, from: status, note })
    .safeParse({ projectId, titleId, from, note: text });
  if (!parsed.success || !access.organizationId)
    return { ok: false, error: t.invalid };
  const project = await getProject(parsed.data.projectId);
  if (!project) return { ok: false, error: t.failed };
  const plan = await loadTitlePlan(project, parsed.data.titleId, access);
  if (!plan) return { ok: false, error: t.failed };
  if (!plan.canEdit) return { ok: false, error: fr.auth.errors.forbidden };

  const supabase = await createClient();
  // Each image published on its own: a visual that cannot be read is left
  // out without shifting the others.
  const images = new Map<string, DocImage>();
  for (const key of visualsUsed(plan, plan.config)) {
    const visual = plan.visuals.find((v) => v.key === key)?.visual;
    if (!visual) continue;
    const [image] = await publishVisuals(
      supabase,
      access.organizationId,
      project.id,
      [visual],
    );
    if (image) images.set(key, image);
  }
  let content;
  try {
    content = buildTitlePlan(
      {
        title: plan.label,
        artist: plan.artist.name,
        guests: plan.guests,
        single: plan.release.single,
        releaseDate: plan.release.date,
        defaultCover: plan.defaultCover,
        actions: plan.actions,
        images,
        strategy: plan.strategy,
        generatedBy: plan.generatedBy,
        generatedAt: new Date().toISOString(),
      },
      plan.config,
    );
  } catch (error) {
    console.error("recordTitlePlanVersion:", (error as Error).message);
    return { ok: false, error: t.failed };
  }
  const { error } = await supabase.rpc("record_title_release_plan_version", {
    p_plan_id: plan.planId,
    p_from: parsed.data.from,
    p_content: content,
    p_sources: sourcesFor(plan.actions),
    p_note: parsed.data.note ?? undefined,
  });
  if (error) return failure(error, "recordTitlePlanVersion");
  refresh(project.id);
  return { ok: true };
}

export type TitlePlanShareResult =
  { ok: true; url: string } | { ok: false; error: string };

/** « Copier le lien de partage »: the version's link (created once, then
 * reused while it lives). */
export async function shareTitlePlanVersion(
  projectId: string,
  versionId: string,
): Promise<TitlePlanShareResult> {
  await requireApproved();
  if (!id.safeParse(projectId).success || !id.safeParse(versionId).success)
    return { ok: false, error: t.failed };
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc(
    "share_title_release_plan_version",
    { p_version_id: versionId },
  );
  if (error || !token)
    return error
      ? failure(error, "shareTitlePlanVersion")
      : { ok: false, error: t.failed };
  refresh(projectId);
  return { ok: true, url: `${siteUrl()}${routes.sharedTitlePlan(token)}` };
}

/** « Retirer le lien »: the version's live links stop working. */
export async function revokeTitlePlanLink(
  projectId: string,
  versionId: string,
): Promise<WriteResult> {
  await requireApproved();
  if (!id.safeParse(projectId).success || !id.safeParse(versionId).success)
    return { ok: false, error: t.failed };
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_title_release_plan_link", {
    p_version_id: versionId,
  });
  if (error) return failure(error, "revokeTitlePlanLink");
  refresh(projectId);
  return { ok: true };
}
