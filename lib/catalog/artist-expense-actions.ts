"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  ARTIST_EXPENSE_CATEGORIES,
  ARTIST_EXPENSE_STATUSES,
} from "@/lib/catalog/artist-expenses";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { createClient } from "@/lib/supabase/server";

// Written with the user's session: manage_catalog on a signed artist only
// (RLS, migration 20261108120101_artist_expenses).

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const expenseInput = z.object({
  id: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.uuid().nullable()),
  label: z.string().trim().min(1).max(200),
  amount: z.string().transform((value, ctx) => {
    const cents = parseEurosToCents(value);
    if (!cents) {
      ctx.addIssue({ code: "custom" });
      return z.NEVER;
    }
    return cents;
  }),
  category: z.enum(ARTIST_EXPENSE_CATEGORIES),
  categoryDetail: optionalText(120),
  spentOn: z.iso.date(),
  status: z.enum(ARTIST_EXPENSE_STATUSES),
  note: optionalText(1000),
});

export type ArtistExpenseInput = z.input<typeof expenseInput>;

function done(
  artistId: string,
  error: { code?: string; message?: string } | null,
): ActionResult {
  if (error) return fromDatabaseError(error);
  revalidatePath(routes.artistBudget(artistId));
  return ok;
}

/** Adds a spend to a signed artist, or updates it when `id` is given. */
export async function saveArtistExpense(
  artistId: string,
  input: ArtistExpenseInput,
): Promise<ActionResult> {
  const p = expenseInput.safeParse(input);
  const access = await requireApproved();
  if (!p.success || !z.uuid().safeParse(artistId).success)
    return fail("invalid_input");
  if (p.data.category === "other" && !p.data.categoryDetail)
    return fail("invalid_input");
  if (!access.organizationId) return fail("forbidden");

  const values = {
    label: p.data.label,
    amount_cents: p.data.amount,
    category: p.data.category,
    category_detail: p.data.category === "other" ? p.data.categoryDetail : null,
    spent_on: p.data.spentOn,
    status: p.data.status,
    note: p.data.note,
  };
  const supabase = await createClient();
  if (p.data.id) {
    const { data, error } = await supabase
      .from("artist_expenses")
      .update(values)
      .eq("id", p.data.id)
      .eq("artist_id", artistId)
      .select("id");
    // RLS hides a refused update: no row back means no right.
    if (!error && !data?.length) return fail("forbidden");
    return done(artistId, error);
  }
  const { error } = await supabase.from("artist_expenses").insert({
    ...values,
    organization_id: access.organizationId,
    artist_id: artistId,
  });
  return done(artistId, error);
}

export async function deleteArtistExpense(
  artistId: string,
  expenseId: string,
): Promise<ActionResult> {
  if (
    !z.uuid().safeParse(artistId).success ||
    !z.uuid().safeParse(expenseId).success
  )
    return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artist_expenses")
    .delete()
    .eq("id", expenseId)
    .eq("artist_id", artistId)
    .select("id");
  if (!error && !data?.length) return fail("forbidden");
  return done(artistId, error);
}
