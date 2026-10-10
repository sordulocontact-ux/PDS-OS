"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { routes } from "@/lib/auth/redirects";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import {
  buildPressKit,
  buildReleasePlan,
  pressDefaults,
} from "@/lib/strategy/documents/build";
import {
  pressKitConfigOf,
  pressKitConfigSchema,
  releasePlanConfigOf,
  releasePlanConfigSchema,
  type ReleasePlanConfig,
} from "@/lib/strategy/documents/model";
import { proposePhases } from "@/lib/strategy/documents/phases";
import { formatsFrom } from "@/lib/strategy/documents/plan-steps";
import {
  loadPressKitConfig,
  loadReleasePlanConfig,
} from "@/lib/strategy/documents/drafts";
import { loadDocumentSources } from "@/lib/strategy/documents/sources";
import { publishVisuals } from "@/lib/strategy/documents/visuals";
import {
  loadStrategyPage,
  type StrategyPageData,
} from "@/lib/strategy/page-data";
import { createClient } from "@/lib/supabase/server";

const kindSchema = z.enum(["release_plan", "press_kit"]);
type ExternalKind = z.infer<typeof kindSchema>;

const schemaOf = (kind: ExternalKind) =>
  kind === "release_plan" ? releasePlanConfigSchema : pressKitConfigSchema;
const generatorRoute = (
  kind: ExternalKind,
  projectId: string,
  step?: number,
) =>
  kind === "release_plan"
    ? routes.projectStrategyReleasePlan(projectId, step)
    : routes.projectStrategyPressKit(projectId, step);

// A step not done yet keeps what PO proposed (phases from the calendar, the
// validated deliverables as contents), as its screen shows it.
const withDefaults = (
  config: ReleasePlanConfig,
  page: StrategyPageData,
): ReleasePlanConfig => ({
  ...config,
  phases:
    config.phases ??
    proposePhases(page.data.milestones, page.data.referenceDate),
  formats: config.formats ?? formatsFrom(page.data.deliverables),
});

const readConfig = (projectId: string, kind: ExternalKind) =>
  kind === "release_plan"
    ? loadReleasePlanConfig(projectId)
    : loadPressKitConfig(projectId);

/**
 * Keeps a generator's choices between visits (strategy_document_drafts): the
 * patch is merged into what was saved, then checked whole. The owner only
 * (RLS); nothing here is a document yet.
 */
export async function saveDocumentDraft(
  projectId: string,
  kind: ExternalKind,
  patch: Record<string, unknown>,
): Promise<ActionResult> {
  if (
    !z.uuid().safeParse(projectId).success ||
    !kindSchema.safeParse(kind).success
  )
    return fail("invalid_input");
  const page = await loadStrategyPage(projectId);
  if (!page.canEdit || !page.access.organizationId) return fail("forbidden");
  const current = await readConfig(projectId, kind);
  const parsed = schemaOf(kind).safeParse({ ...current, ...patch });
  if (!parsed.success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("strategy_document_drafts").upsert(
    {
      project_id: projectId,
      kind,
      organization_id: page.access.organizationId,
      config: parsed.data,
    },
    { onConflict: "project_id,kind" },
  );
  if (error) return fromDatabaseError(error);
  revalidatePath(generatorRoute(kind, projectId));
  return ok;
}

/**
 * « Générer »: the version is written here, on the server, from the
 * validated Brief de sortie, the project and the saved choices; the allowed
 * visuals are published with it. The database refuses it before the Brief
 * is validated or while a Brief version waits for its reviewers.
 */
export async function generateExternalDocument(
  projectId: string,
  kind: ExternalKind,
): Promise<ActionResult> {
  if (
    !z.uuid().safeParse(projectId).success ||
    !kindSchema.safeParse(kind).success
  )
    return fail("invalid_input");
  const page = await loadStrategyPage(projectId);
  const organizationId = page.access.organizationId;
  if (!page.canEdit || !organizationId) return fail("forbidden");
  const sources = await loadDocumentSources(page, {
    withBio: kind === "press_kit",
  });
  if (!sources) return fail("brief_not_validated");
  const own = await readConfig(projectId, kind);
  // The Dossier de presse starts from the Plan de sortie's visuals and
  // direction until it has its own (as its screens offer them).
  const plan =
    kind === "press_kit" ? await loadReleasePlanConfig(projectId) : null;
  const config = {
    ...own,
    visuals: own.visuals ?? plan?.visuals,
    direction: own.direction ?? plan?.direction,
  };
  const supabase = await createClient();
  const images = await publishVisuals(
    supabase,
    organizationId,
    projectId,
    config.visuals ?? [],
  );
  const input = {
    brief: sources.brief,
    milestones: page.data.milestones,
    images,
    generatedBy: page.project.ownerName ?? "",
  };
  const content =
    kind === "release_plan"
      ? buildReleasePlan(input, withDefaults(releasePlanConfigOf(config), page))
      : buildPressKit(
          {
            ...input,
            links: sources.links,
            defaults: pressDefaults(sources.brief, {
              bio: sources.artist?.bio ?? null,
              owner: sources.owner,
            }),
          },
          pressKitConfigOf(config),
        );
  const { error } = await supabase.rpc("create_strategy_document", {
    p_project_id: projectId,
    p_kind: kind,
    p_content: content,
  });
  if (error) return fromDatabaseError(error);
  revalidatePath(routes.projectStrategy(projectId), "layout");
  redirect(generatorRoute(kind, projectId, kind === "release_plan" ? 8 : 4));
}
