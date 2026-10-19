"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { linkKeyArgs, linkKeyPath } from "@/lib/portal/link-key";
import { TOKEN } from "@/lib/production/provider/public";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; number: number } | { ok: false; error: string };
const e = fr.productionLight.errors;

const size = z.number().int().min(1).max(30000).nullable();
const schema = z
  .object({
    token: z.string().regex(TOKEN),
    url: z.string().trim().max(2000).nullable(),
    path: z.string().max(400).nullable(),
    fileName: z.string().trim().max(255).nullable(),
    width: size,
    height: size,
  })
  .refine((v) => (v.url === null) !== (v.path === null));

/** « Déposer la Vn » of a cover or of teasers, from the link of whoever
 * produces them: the image sent to a one-time path (its size read by the
 * browser) or a link. */
export async function depositLightVersionByLink(
  input: z.input<typeof schema>,
): Promise<Result> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.one_media };
  const p = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "deposit_production_light_version_by_link",
    {
      ...linkKeyArgs(p.token),
      p_url: p.url,
      p_path: p.path,
      p_file_name: p.fileName,
      p_width: p.width,
      p_height: p.height,
    },
  );
  if (error || data === null) {
    const key = (Object.keys(e) as (keyof typeof e)[]).find((k) =>
      error?.message.includes(k),
    );
    if (!key) console.error("depositLightVersionByLink:", error?.message);
    return { ok: false, error: key ? e[key] : e.failed };
  }
  await schedulePendingPushes();
  revalidatePath(linkKeyPath("p", p.token));
  return { ok: true, number: data };
}
