"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { TOKEN } from "@/lib/production/provider/public";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { createClient } from "@/lib/supabase/server";
import { linkKeyArgs, linkKeyPath } from "@/lib/portal/link-key";

// The provider's part of the journey, from their link, without an account:
// the database checks the token, the role and the stage.

type Result = { ok: true } | { ok: false; error: string };
const e = fr.productionLink.errors;
const token = z.string().regex(TOKEN);

function failure(message: string | undefined): Result {
  const p = fr.productionProvider.errors;
  if (message?.includes("link_closed"))
    return { ok: false, error: p.link_closed };
  if (message?.includes("stage_locked"))
    return { ok: false, error: p.stage_locked };
  console.error("production link journey:", message);
  return { ok: false, error: p.failed };
}
async function done(t: string): Promise<Result> {
  await schedulePendingPushes();
  revalidatePath(linkKeyPath("p", t));
  return { ok: true };
}
const https = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v));

const quoteSchema = z.object({
  token,
  label: z.string().trim().max(200),
  amount: z.string().trim().min(1),
  loc: z.string().trim().min(1),
  deliveryOn: z.iso.date().or(z.literal("")),
  url: https.refine((v) => v !== ""),
  note: z.string().trim().max(1000),
});
export async function depositQuoteByLink(
  input: z.input<typeof quoteSchema>,
): Promise<Result> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.path[0] === "url"
          ? e.url
          : parsed.error.issues[0]?.path[0] === "loc"
            ? fr.productionQuotes.errors.loc
            : e.amount,
    };
  const p = parsed.data;
  const cents = parseEurosToCents(p.amount);
  if (cents === null || cents === undefined)
    return { ok: false, error: e.amount };
  const loc = parseEurosToCents(p.loc);
  if (loc === null || loc === undefined)
    return { ok: false, error: fr.productionQuotes.errors.loc };
  if (loc > cents)
    return { ok: false, error: fr.productionQuotes.errors.locOver };
  const supabase = await createClient();
  const { error } = await supabase.rpc("deposit_production_quote_by_link", {
    ...linkKeyArgs(p.token),
    p_label: p.label,
    p_amount_cents: cents,
    p_loc_budget_cents: loc,
    p_delivery_on: p.deliveryOn || null,
    p_url: p.url || null,
    p_note: p.note || null,
  });
  return error ? failure(error.message) : done(p.token);
}

const progressSchema = z.object({
  token,
  key: z.enum(["calls", "gear", "crew", "schedule"]),
  done: z.boolean(),
});
export async function setProgressByLink(
  input: z.input<typeof progressSchema>,
): Promise<Result> {
  const parsed = progressSchema.safeParse(input);
  if (!parsed.success) return failure("invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_production_progress_by_link", {
    ...linkKeyArgs(parsed.data.token),
    p_key: parsed.data.key,
    p_done: parsed.data.done,
  });
  return error ? failure(error.message) : done(parsed.data.token);
}

const placeSchema = z.object({
  token,
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().max(500),
  price: z.string().trim().max(20),
  availability: z.string().trim().max(1000),
  constraints: z.string().trim().max(2000),
  url: https,
});
export async function proposeLocationByLink(
  input: z.input<typeof placeSchema>,
): Promise<Result> {
  const parsed = placeSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.path[0] === "url" ? e.url : e.name,
    };
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("propose_production_location_by_link", {
    ...linkKeyArgs(p.token),
    p_name: p.name,
    p_address: p.address || null,
    p_price_cents: p.price ? (parseEurosToCents(p.price) ?? null) : null,
    p_availability: p.availability || null,
    p_constraints: p.constraints || null,
    p_url: p.url || null,
  });
  return error ? failure(error.message) : done(p.token);
}

const directionSchema = z.object({
  token,
  stagingIntent: z.string().trim().min(1).max(4000),
  runOfShow: z.string().trim().min(1).max(4000),
  references: z.string().trim().max(4000),
});
export async function submitDirectionByLink(
  input: z.input<typeof directionSchema>,
): Promise<Result> {
  const parsed = directionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.direction };
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_production_direction_by_link", {
    ...linkKeyArgs(p.token),
    p_staging_intent: p.stagingIntent,
    p_run_of_show: p.runOfShow,
    p_references_note: p.references,
  });
  return error ? failure(error.message) : done(p.token);
}

const gearSchema = z.object({
  token,
  lines: z.string().trim().min(1).max(10000),
});
/** « 2 × Aputure 600d » → quantity 2; one article per line, 50 at most. */
export async function addGearByLink(
  input: z.input<typeof gearSchema>,
): Promise<Result & { count?: number }> {
  const parsed = gearSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.lines };
  const lines = parsed.data.lines
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((l) => {
      const m = /^(\d{1,4})\s*[x×]\s*(.+)$/i.exec(l);
      return m
        ? { label: m[2].trim(), quantity: m[1] }
        : { label: l, quantity: null };
    });
  if (lines.length === 0) return { ok: false, error: e.lines };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_production_gear_by_link", {
    ...linkKeyArgs(parsed.data.token),
    p_lines: lines,
  });
  if (error) return failure(error.message);
  await done(parsed.data.token);
  return { ok: true, count: data ?? lines.length };
}
