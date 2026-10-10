"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { canEditProject } from "@/lib/projects/edit-access";
import { projectKindLabel } from "@/lib/projects/labels";
import { getProject } from "@/lib/projects/queries";
import { buildPressKit } from "@/lib/strategy/documents/press-kit-build";
import {
  pressKitConfigOf,
  pressKitConfigSchema,
} from "@/lib/strategy/documents/press-kit-model";
import { pressKitInput } from "@/lib/strategy/documents/press-kit-sources";
import { visualKey } from "@/lib/strategy/documents/release-plan-model";
import { publishVisuals } from "@/lib/strategy/documents/visuals";
import { loadStrategy } from "@/lib/strategy/queries";
import { createClient } from "@/lib/supabase/server";

// The Dossier de presse generator (ticket Stratégie § 12), the same way as
// the Plan de sortie's: every write through the user's session, RLS lets
// only the project's owner keep a draft, the database decides a version.

const id = z.uuid();
const KIND = "press_kit";

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
    config: pressKitConfigOf(data?.config),
  };
}

/** Saves a step's choices into the draft, merged with the others. */
export async function savePressKitDraft(
  projectId: string,
  patch: unknown,
): Promise<ActionResult> {
  const parsed = pressKitConfigSchema.safeParse(patch);
  if (!id.safeParse(projectId).success || !parsed.success)
    return fail("invalid_input");
  const access = await requireApproved();
  if (!access.organizationId) return fail("not_found");
  const { supabase, exists, config } = await currentConfig(projectId);
  const merged = pressKitConfigSchema.safeParse({ ...config, ...parsed.data });
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
  revalidatePath(routes.projectStrategyPressKit(projectId));
  return ok;
}

/**
 * « Générer le Dossier de presse »: the server reads the validated strategy,
 * the artist sheet, the project and the draft again (nothing comes from the
 * browser), publishes the allowed visuals, builds the document and writes it
 * as the next version. The database refuses it without a validated Brief or
 * while one is pending.
 */
export async function generatePressKit(
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
  const kind = projectKindLabel({
    type: project.type,
    musicFormat: project.musicFormat,
    contentFormatName: project.contentFormat?.name ?? null,
  });
  const [images, input] = await Promise.all([
    publishVisuals(supabase, access.organizationId, projectId, visuals),
    pressKitInput(project, kind, data),
  ]);
  let content;
  try {
    content = buildPressKit(
      {
        ...input,
        images,
        generatedBy: project.ownerName ?? "",
        generatedAt: new Date().toISOString(),
      },
      config,
    );
  } catch (error) {
    console.error("generatePressKit:", (error as Error).message);
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
