"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { linkKeyArgs, linkKeyPath } from "@/lib/portal/link-key";
import { TOKEN } from "@/lib/production/provider/public";
import { createClient } from "@/lib/supabase/server";

// The edit on a private link (production.md § 2.16): the external creative
// validation decides a version, the company deposits the final file. The
// database checks the link, its role and the version.

type Result = { ok: true } | { ok: false; error: string };
const e = fr.productionCut.errors;

function failure(message: string): Result {
  const key = (Object.keys(e) as (keyof typeof e)[]).find((k) =>
    message.includes(k),
  );
  if (!key) console.error("cut by link:", message);
  return { ok: false, error: key ? e[key] : e.failed };
}

const decideSchema = z.object({
  token: z.string().regex(TOKEN),
  versionId: z.uuid(),
  approve: z.boolean(),
  note: z.string().trim().max(2000),
});

/** « Valider le montage Vn » / « Demander des modifications » (the
 * external creative validation, in addition to the internal one). */
export async function decideCutByLink(
  input: z.input<typeof decideSchema>,
): Promise<Result> {
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.failed };
  const p = parsed.data;
  if (!p.approve && !p.note) return { ok: false, error: e.reason_required };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_production_version_by_link", {
    ...linkKeyArgs(p.token),
    p_version_id: p.versionId,
    p_approve: p.approve,
    p_note: p.note,
  });
  if (error) return failure(error.message);
  await schedulePendingPushes();
  revalidatePath(linkKeyPath("p", p.token));
  return { ok: true };
}

const finalSchema = z.object({
  token: z.string().regex(TOKEN),
  url: z
    .string()
    .trim()
    .max(2000)
    .regex(/^https:\/\/\S+$/),
});

/** « Déposer le fichier final du montage Vn » (the company). */
export async function setFinalByLink(
  input: z.input<typeof finalSchema>,
): Promise<Result> {
  const parsed = finalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid_url };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_production_final_by_link", {
    ...linkKeyArgs(parsed.data.token),
    p_url: parsed.data.url,
  });
  if (error) return failure(error.message);
  await schedulePendingPushes();
  revalidatePath(linkKeyPath("p", parsed.data.token));
  return { ok: true };
}
