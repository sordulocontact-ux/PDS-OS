"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { BUDGET_FAMILIES } from "@/lib/budget/types";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = artistBudget.errors;

const euros = z.string().transform((value, ctx) => {
  const cents = parseEurosToCents(value);
  if (cents === undefined || cents === null || cents <= 0) {
    ctx.addIssue({ code: "custom" });
    return z.NEVER;
  }
  return cents;
});

const envelopeInput = z.object({
  artistId: z.uuid(),
  // The open envelope changed; none: a new one is opened.
  budgetId: z.uuid().optional(),
  amount: euros,
  startsOn: z.iso.date(),
  endsOn: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.iso.date().nullable()),
  posts: z.partialRecord(z.enum(BUDGET_FAMILIES), euros),
});

export type EnvelopeInput = z.input<typeof envelopeInput>;

/**
 * Opens an artist's envelope (the open one closed and kept) or changes the
 * open one: the direction alone, each change journaled (SQL,
 * 20261111210101). The postes never add up to more than the amount.
 */
export async function saveArtistEnvelope(
  input: EnvelopeInput,
): Promise<WriteResult> {
  const p = envelopeInput.safeParse(input);
  await requireApproved();
  if (!p.success) return { ok: false, error: t.invalid };
  const { artistId, budgetId, amount, startsOn, endsOn, posts } = p.data;
  const total = Object.values(posts).reduce((sum, c) => sum + (c ?? 0), 0);
  if (total > amount) return { ok: false, error: t.postsOverTotal };

  const supabase = await createClient();
  const args = {
    p_amount_cents: amount,
    p_starts_on: startsOn,
    // Null: open-ended (the SQL takes it; the generated type does not say).
    p_ends_on: endsOn as string,
    p_posts: posts,
  };
  const { error } = budgetId
    ? await supabase.rpc("update_artist_budget", {
        ...args,
        p_budget_id: budgetId,
      })
    : await supabase.rpc("open_artist_budget", {
        ...args,
        p_artist_id: artistId,
      });
  if (error) {
    const message = error.message;
    if (error.code === "42501" || message.includes("forbidden"))
      return { ok: false, error: t.forbidden };
    if (message.includes("posts_over_total"))
      return { ok: false, error: t.postsOverTotal };
    if (message.includes("budget_starts_before_previous"))
      return { ok: false, error: t.startsBeforePrevious };
    if (message.includes("budget_closed"))
      return { ok: false, error: t.closed };
    console.error("saveArtistEnvelope:", message);
    return { ok: false, error: t.generic };
  }
  revalidatePath(routes.artist(artistId), "layout");
  const done = artistBudget.done;
  return { ok: true, done: budgetId ? done.changed : done.opened };
}
