import "server-only";

import {
  pressKitConfigOf,
  releasePlanConfigOf,
  type PressKitConfig,
  type ReleasePlanConfig,
} from "@/lib/strategy/documents/model";
import { createClient } from "@/lib/supabase/server";

async function rawConfig(
  projectId: string,
  kind: "release_plan" | "press_kit",
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("strategy_document_drafts")
    .select("config")
    .eq("project_id", projectId)
    .eq("kind", kind)
    .maybeSingle();
  return data?.config ?? null;
}

/** The Plan de sortie generator's saved choices (empty when none). */
export async function loadReleasePlanConfig(
  projectId: string,
): Promise<ReleasePlanConfig> {
  return releasePlanConfigOf(await rawConfig(projectId, "release_plan"));
}

/** The Dossier de presse generator's saved choices (empty when none). */
export async function loadPressKitConfig(
  projectId: string,
): Promise<PressKitConfig> {
  return pressKitConfigOf(await rawConfig(projectId, "press_kit"));
}
