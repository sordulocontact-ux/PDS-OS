"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designError, refreshConception } from "@/lib/design/actions/shared";
import { liveCreativeBrief } from "@/lib/design/brief-live";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

/**
 * « Créer une nouvelle version » of the Brief créatif: its content is built
 * here from what the project holds (never sent by the browser), then stored
 * as the next version. Refused while a blocking check remains (MKT-C2-12:
 * a dossier without direction). The direction's responsible or the owner;
 * the database checks (create_design_brief).
 */
export async function createCreativeBrief(
  projectId: string,
): Promise<{ ok: true; number: number } | { ok: false; error: string }> {
  if (!z.uuid().safeParse(projectId).success)
    return { ok: false, error: fr.conception.errors.generic };
  const access = await requireApproved();
  const live = await liveCreativeBrief(projectId, access);
  if (!live) return { ok: false, error: fr.conception.errors.generic };
  if (live.checks.blocking.length)
    return { ok: false, error: live.checks.blocking[0] };

  const supabase = await createClient();
  const { data: number, error } = await supabase.rpc("create_design_brief", {
    p_project_id: projectId,
    p_content: live.content as unknown as Json,
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

/**
 * « Établir le Brief créatif Vn » in the step (proto deB): the same
 * version, built by code, and what follows (VISION-UX rule 7).
 */
export async function establishCreativeBrief(
  projectId: string,
  done: string,
): Promise<WriteResult> {
  if (!z.uuid().safeParse(projectId).success)
    return { ok: false, error: fr.conception.errors.generic };
  return withOutcome(projectId, ["marketing"], done, async () => {
    const result = await createCreativeBrief(projectId);
    return result.ok ? { ok: true } : result;
  });
}
