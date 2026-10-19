"use server";

import { revalidatePath } from "next/cache";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import type { CheckReleaseResult } from "@/lib/release/action-types";
import { detectAndRecord } from "@/lib/release/persist";
import { getProjectRelease } from "@/lib/release/queries";
import { isUuid } from "@/lib/release/uuid";
import { createClient } from "@/lib/supabase/server";

/**
 * Release page actions. Every write goes through the user's client: RLS and
 * column grants are the security, the checks here only give clean errors.
 */

async function load(projectId: string) {
  await requireApproved();
  if (!isUuid(projectId)) return null;
  const supabase = await createClient();
  const data = await getProjectRelease(supabase, projectId);
  return data ? { supabase, ...data } : null;
}

export async function checkRelease(
  projectId: string,
): Promise<CheckReleaseResult> {
  const context = await load(projectId);
  if (!context?.release) return { ok: false, error: "not_found" };
  const { supabase, release } = context;
  if (!release.isrc) return { ok: false, error: "no_isrc" };

  const outcome = await detectAndRecord(supabase, {
    id: release.id,
    isrc: release.isrc,
    spotifyUrl: release.spotify_url,
  });
  if (!outcome.ok) {
    return {
      ok: false,
      error: outcome.error === "detection_failed" ? outcome.error : "generic",
    };
  }

  revalidatePath(routes.projectRelease(projectId), "layout");
  return { ok: true, linkCount: outcome.linkCount };
}

export async function setSmartlinkEnabled(
  projectId: string,
  enabled: boolean,
): Promise<{ ok: boolean }> {
  const context = await load(projectId);
  if (!context?.release) return { ok: false };
  const { error } = await context.supabase
    .from("releases")
    .update({ smartlink_enabled: enabled === true })
    .eq("id", context.release.id);
  if (error) {
    console.error("setSmartlinkEnabled:", error.code, error.message);
    return { ok: false };
  }
  revalidatePath(routes.projectRelease(projectId), "layout");
  return { ok: true };
}
