"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/auth/site-url";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { canEditProject } from "@/lib/projects/edit-access";
import { projectKindLabel } from "@/lib/projects/labels";
import { getProject } from "@/lib/projects/queries";
import { buildReleasePlan } from "@/lib/strategy/documents/release-plan-build";
import {
  releasePlanConfigOf,
  releasePlanConfigSchema,
  visualKey,
} from "@/lib/strategy/documents/release-plan-model";
import { releasePlanInput } from "@/lib/strategy/documents/release-plan-input";
import { publishVisuals } from "@/lib/strategy/documents/visuals";
import { loadStrategy } from "@/lib/strategy/queries";
import { createClient } from "@/lib/supabase/server";

// The Plan de sortie generator (ticket Stratégie § 11). Every write goes
// through the user's session: RLS lets only the project's owner keep a
// draft, the database functions decide a version and a shared link.

const id = z.uuid();
const KIND = "release_plan";

async function currentConfig(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("strategy_document_drafts")
    .select("config")
    .eq("project_id", projectId)
    .eq("kind", KIND)
    .maybeSingle();
  return {
    supabase,
    exists: Boolean(data),
    config: releasePlanConfigOf(data?.config),
  };
}

/** Saves a step's choices into the draft, merged with the others. */
export async function saveReleasePlanDraft(
  projectId: string,
  patch: unknown,
): Promise<ActionResult> {
  const parsed = releasePlanConfigSchema.safeParse(patch);
  if (!id.safeParse(projectId).success || !parsed.success)
    return fail("invalid_input");
  const access = await requireApproved();
  if (!access.organizationId) return fail("not_found");
  const { supabase, exists, config } = await currentConfig(projectId);
  const merged = releasePlanConfigSchema.safeParse({
    ...config,
    ...parsed.data,
  });
  if (!merged.success) return fail("invalid_input");
  const { error } = exists
    ? await supabase
        .from("strategy_document_drafts")
        .update({ config: merged.data })
        .eq("project_id", projectId)
        .eq("kind", KIND)
    : await supabase.from("strategy_document_drafts").insert({
        project_id: projectId,
        kind: KIND,
        organization_id: access.organizationId,
        config: merged.data,
      });
  if (error) return fromDatabaseError(error);
  revalidatePath(routes.projectStrategyReleasePlan(projectId));
  return ok;
}

/**
 * « Générer le Plan de sortie »: the server reads the validated strategy and
 * the draft again (nothing comes from the browser), publishes the allowed
 * visuals, builds the document and writes it as the next version. The
 * database refuses it without a validated Brief or while one is pending.
 */
export async function generateReleasePlan(
  projectId: string,
): Promise<ActionResult> {
  if (!id.safeParse(projectId).success) return fail("invalid_input");
  const access = await requireApproved();
  const project = await getProject(projectId);
  if (!project || !access.organizationId) return fail("not_found");
  if (!canEditProject(access, project)) return fail("forbidden");
  const [data, { supabase, config }] = await Promise.all([
    loadStrategy(projectId, access),
    currentConfig(projectId),
  ]);
  if (!data) return fail("not_found");

  const selected = new Set(config.selected ?? []);
  const visuals = (config.visuals ?? []).filter((v) =>
    selected.has(visualKey(v)),
  );
  const images = await publishVisuals(
    supabase,
    access.organizationId,
    projectId,
    visuals,
  );
  const kind = projectKindLabel({
    type: project.type,
    musicFormat: project.musicFormat,
    contentFormatName: project.contentFormat?.name ?? null,
  });
  const generatedBy = project.ownerName ?? "";
  let content;
  try {
    content = buildReleasePlan(
      { ...releasePlanInput(project, kind, data, generatedBy), images },
      config,
    );
  } catch (error) {
    console.error("generateReleasePlan:", (error as Error).message);
    return fail("generic");
  }
  const { error } = await supabase.rpc("create_strategy_document", {
    p_project_id: projectId,
    p_kind: KIND,
    p_content: content,
  });
  if (error) return fromDatabaseError(error);
  revalidatePath(routes.project(projectId), "layout");
  return ok;
}

export type ShareResult = { ok: true; url: string } | { ok: false };

/** « Partager »: the version's public link (created once, then reused). */
export async function shareReleasePlan(
  projectId: string,
  documentId: string,
): Promise<ShareResult> {
  if (!id.safeParse(projectId).success || !id.safeParse(documentId).success)
    return { ok: false };
  await requireApproved();
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("share_strategy_document", {
    p_document_id: documentId,
  });
  if (error || !token) {
    console.error("shareReleasePlan:", error?.message);
    return { ok: false };
  }
  return { ok: true, url: `${siteUrl()}${routes.sharedDocument(token)}` };
}
