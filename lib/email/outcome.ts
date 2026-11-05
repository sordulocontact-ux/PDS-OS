import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { WriteDone } from "@/lib/utils/write-result";

/** The project's title, for the subject of an e-mail (« « Titre » : … »). */
export async function projectTitleOf(projectId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("title")
    .eq("id", projectId)
    .maybeSingle();
  return data?.title ?? "";
}

/**
 * What a gesture says after trying to e-mail (Sacha, 05/11/2026): « sent »
 * is the success toast (`sent`), « failed » a warning that the e-mail did
 * not leave (the link stays to copy by hand), « disabled » nothing more:
 * the manual way is as it was. The gesture itself never fails because of
 * the e-mail.
 */
export function emailOutcome(
  outcome: "sent" | "failed" | "disabled",
  say: { sent: string; failed: string },
): WriteDone {
  if (outcome === "sent") return { ok: true, done: say.sent };
  if (outcome === "failed") return { ok: true, notice: say.failed };
  return { ok: true };
}
