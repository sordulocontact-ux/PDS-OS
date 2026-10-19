"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { TOKEN } from "@/lib/production/provider/public";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };
const t = fr.productionLink.director;

const schema = z.object({
  token: z.string().regex(TOKEN),
  name: z.string().trim().min(1).max(200),
  reel: z
    .string()
    .trim()
    .max(2000)
    .regex(/^https:\/\/\S+$/),
  note: z.string().trim().max(1000),
});

/** « Proposer à PDS » (the company, from its link, proto portalDirector):
 * a director, his showreel and why; PDS retains one. */
export async function proposeDirectorByLink(
  input: z.input<typeof schema>,
): Promise<Result> {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.path[0] === "name"
          ? t.errors.name
          : t.errors.reel,
    };
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("propose_production_director_by_link", {
    p_token: p.token,
    p_name: p.name,
    p_reel_url: p.reel,
    p_note: p.note || null,
  });
  if (error) {
    const e = fr.productionProvider.errors;
    if (error.message.includes("link_closed"))
      return { ok: false, error: e.link_closed };
    if (error.message.includes("stage_locked"))
      return { ok: false, error: e.stage_locked };
    console.error("proposeDirectorByLink:", error.message);
    return { ok: false, error: e.failed };
  }
  await schedulePendingPushes();
  revalidatePath(`/p/${p.token}`);
  return { ok: true };
}
