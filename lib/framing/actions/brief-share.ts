"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/server";

export type BriefShareResult = { ok: true; url: string } | { ok: false };

/**
 * « Copier le lien » of the Brief de cadrage: the project's public link to
 * the PDF of its latest version sent (share_framing_brief, created once then
 * reused; the owner or the direction, once a version was sent).
 */
export async function shareFramingBrief(
  projectId: string,
): Promise<BriefShareResult> {
  if (!z.uuid().safeParse(projectId).success) return { ok: false };
  await requireApproved();
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("share_framing_brief", {
    p_project_id: projectId,
  });
  if (error || !token) {
    console.error("shareFramingBrief:", error?.message);
    return { ok: false };
  }
  return { ok: true, url: `${siteUrl()}${routes.sharedFramingBrief(token)}` };
}
