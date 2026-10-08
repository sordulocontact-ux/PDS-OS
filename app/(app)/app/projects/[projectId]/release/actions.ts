"use server";

import { revalidatePath } from "next/cache";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import type {
  CheckReleaseResult,
  SaveReleaseState,
} from "@/lib/release/action-types";
import { detectAndRecord } from "@/lib/release/persist";
import { getProjectRelease } from "@/lib/release/queries";
import { parseReleaseForm, type ReleaseField } from "@/lib/release/schema";
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

export async function saveRelease(
  projectId: string,
  _previous: SaveReleaseState,
  formData: FormData,
): Promise<SaveReleaseState> {
  const fields: ReleaseField[] = [
    "title",
    "isrc",
    "upc",
    "plannedReleaseDate",
    "spotifyUrl",
  ];
  const values = Object.fromEntries(
    fields.map((name) => [name, String(formData.get(name) ?? "")]),
  ) as Record<ReleaseField, string>;
  const fail = (
    formError: "isrcTaken" | "generic" | null,
    fieldErrors: Partial<Record<ReleaseField, true>> = {},
  ): SaveReleaseState => ({ status: "error", fieldErrors, formError, values });

  const parsed = parseReleaseForm(formData);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<ReleaseField, true>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && fields.includes(field as ReleaseField)) {
        fieldErrors[field as ReleaseField] = true;
      }
    }
    return fail(null, fieldErrors);
  }

  const context = await load(projectId);
  if (!context) return fail("generic");
  const { supabase, project, release } = context;
  const row = {
    title: parsed.data.title,
    isrc: parsed.data.isrc,
    upc: parsed.data.upc,
    planned_release_date: parsed.data.plannedReleaseDate,
    spotify_url: parsed.data.spotifyUrl,
  };

  const { error } = release
    ? await supabase.from("releases").update(row).eq("id", release.id)
    : await supabase.from("releases").insert({
        ...row,
        organization_id: project.organizationId,
        project_id: project.id,
      });

  if (error) {
    if (error.code === "23505") return fail("isrcTaken", { isrc: true });
    console.error("saveRelease:", error.code, error.message);
    return fail("generic");
  }

  revalidatePath(routes.projectRelease(projectId), "layout");
  return { status: "saved", at: Date.now() };
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
