"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { linkKeyArgs, linkKeyPath } from "@/lib/portal/link-key";
import { TOKEN } from "@/lib/production/provider/public";
import { createClient } from "@/lib/supabase/server";

// The proposal on a private link (PR-11): the director deposits its
// versions, the external creative validation decides them. The database
// checks the link, its role and the version.

type Result = { ok: true } | { ok: false; error: string };
const e = fr.productionProposal.errors;

function failure(message: string): Result {
  const key = (Object.keys(e) as (keyof typeof e)[]).find((k) =>
    message.includes(k),
  );
  if (!key) console.error("proposal by link:", message);
  return { ok: false, error: key ? e[key] : e.failed };
}

const https = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v));

const depositSchema = z.object({
  token: z.string().regex(TOKEN),
  treatment: https,
  moodboard: https,
  cutting: https,
  note: z.string().trim().max(2000),
});

/** « Déposer la Vn » (the director, from its link). */
export async function depositProposalByLink(
  input: z.input<typeof depositSchema>,
): Promise<Result> {
  const parsed = depositSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid_url };
  const p = parsed.data;
  if (!p.treatment || !p.cutting)
    return { ok: false, error: e.pieces_required };
  const supabase = await createClient();
  const { error } = await supabase.rpc("deposit_production_direction_by_link", {
    ...linkKeyArgs(p.token),
    p_treatment: p.treatment,
    p_moodboard: p.moodboard || null,
    p_cutting: p.cutting,
    p_note: p.note || null,
  });
  if (error) return failure(error.message);
  await schedulePendingPushes();
  revalidatePath(linkKeyPath("p", p.token));
  return { ok: true };
}

const decideSchema = z.object({
  token: z.string().regex(TOKEN),
  versionId: z.uuid(),
  approve: z.boolean(),
  comment: z.string().trim().max(2000),
});

/** « Valider la Vn » / « Demander des modifications » (the external
 * creative validation, from its link: in addition to the internal one). */
export async function decideProposalByLink(
  input: z.input<typeof decideSchema>,
): Promise<Result> {
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.failed };
  const p = parsed.data;
  if (!p.approve && !p.comment) return { ok: false, error: e.reason_required };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_production_direction_by_link", {
    ...linkKeyArgs(p.token),
    p_version_id: p.versionId,
    p_approve: p.approve,
    p_comment: p.comment,
  });
  if (error) return failure(error.message);
  await schedulePendingPushes();
  revalidatePath(linkKeyPath("p", p.token));
  return { ok: true };
}
