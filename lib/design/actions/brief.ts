"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designError, refreshConception } from "@/lib/design/actions/shared";
import { buildCreativeBrief } from "@/lib/design/brief";
import { loadConception } from "@/lib/design/conception";
import { loadDirection } from "@/lib/design/direction";
import { loadMembers } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/**
 * « Créer une nouvelle version » of the Brief créatif: its content is built
 * here from what the project holds (never sent by the browser), then stored
 * as the next version. The direction's responsible or the owner; the
 * database checks (create_design_brief).
 */
export async function createCreativeBrief(
  projectId: string,
): Promise<{ ok: true; number: number } | { ok: false; error: string }> {
  if (!z.uuid().safeParse(projectId).success)
    return { ok: false, error: fr.conception.errors.generic };
  const access = await requireApproved();
  const project = await getProject(projectId);
  if (!project) return { ok: false, error: fr.conception.errors.generic };
  const [data, members] = await Promise.all([
    loadConception(project, access),
    loadMembers(access),
  ]);
  if (!data) return { ok: false, error: fr.conception.errors.generic };
  const directionData = await loadDirection(projectId, members);
  const content = await buildCreativeBrief(project, data, directionData);

  const supabase = await createClient();
  const { data: number, error } = await supabase.rpc("create_design_brief", {
    p_project_id: projectId,
    p_content: content as unknown as Json,
  });
  if (error || number === null) {
    console.error("createCreativeBrief:", error?.code, error?.message);
    return {
      ok: false,
      error: error ? designError(error) : fr.conception.errors.generic,
    };
  }
  refreshConception(projectId);
  return { ok: true, number };
}
