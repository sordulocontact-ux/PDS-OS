"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { TOKEN } from "@/lib/production/provider/public";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  token: z.string().regex(TOKEN),
  url: z
    .string()
    .trim()
    .max(2000)
    .regex(/^https:\/\/\S+$/),
});

/** « Transmettre le lien » (the company, once the shoot happened). */
export async function setRushesByLink(
  input: z.input<typeof schema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionLink.rushes.errors.url };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_production_rushes_by_link", {
    p_token: parsed.data.token,
    p_url: parsed.data.url,
  });
  if (error) {
    const e = fr.productionProvider.errors;
    if (error.message.includes("link_closed"))
      return { ok: false, error: e.link_closed };
    console.error("setRushesByLink:", error.message);
    return { ok: false, error: e.failed };
  }
  await schedulePendingPushes();
  revalidatePath(`/p/${parsed.data.token}`);
  return { ok: true };
}
