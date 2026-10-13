"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { designError, refreshConception } from "@/lib/design/actions/shared";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

/**
 * « Commencer sans échange » (MKT-C2-05): starts the Conception without a
 * creative exchange, with the reason (start_design_without_exchange), and
 * opens the direct work.
 */
export async function startConceptionWithoutExchange(
  projectId: string,
  reason: string,
): Promise<WriteResult> {
  const p = z
    .object({ projectId: z.uuid(), reason: z.string().trim().min(1).max(1000) })
    .safeParse({ projectId, reason });
  if (!p.success) return { ok: false, error: fr.conception.errors.generic };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_design_without_exchange", {
    p_project_id: p.data.projectId,
    p_reason: p.data.reason,
  });
  if (error) {
    console.error("startConceptionWithoutExchange:", error.code, error.message);
    return { ok: false, error: designError(error) };
  }
  refreshConception(p.data.projectId);
  redirect(routes.projectDesignWork(p.data.projectId));
}
