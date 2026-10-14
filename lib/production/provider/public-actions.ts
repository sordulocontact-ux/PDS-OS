"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { TOKEN } from "@/lib/production/provider/public";
import { createClient } from "@/lib/supabase/server";

// The provider's deposits, from their page, without an account: the
// database checks the token, the stage and the file (PROD-028, PROD-036).

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const ERRORS = [
  "link_closed",
  "stage_locked",
  "invalid_url",
  "one_media",
  "file_mismatch",
  "too_many_deposits",
  "invalid_file_name",
  "line_not_found",
] as const;

function failure(message: string | undefined): { ok: false; error: string } {
  const e = fr.productionProvider.errors;
  const known = ERRORS.find((code) => message?.includes(code));
  if (!known) console.error("production provider:", message);
  return { ok: false, error: known ? e[known] : e.failed };
}

const token = z.string().regex(TOKEN);

const slotSchema = z.object({
  token,
  fileName: z.string().trim().min(1).max(255),
});

/** Step 1 of a file: a one-time path where the browser uploads it. */
export async function openProviderSlot(
  input: z.input<typeof slotSchema>,
): Promise<Result<{ path: string }>> {
  const parsed = slotSchema.safeParse(input);
  if (!parsed.success) return failure(undefined);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_production_provider_slot", {
    p_token: parsed.data.token,
    p_file_name: parsed.data.fileName,
  });
  if (error || !data) return failure(error?.message);
  return { ok: true, path: data };
}

const versionSchema = z
  .object({
    token,
    url: z.string().trim().max(2000).nullable(),
    path: z.string().max(400).nullable(),
    fileName: z.string().trim().max(255).nullable(),
    notes: z.string().trim().max(4000),
  })
  .refine((v) => (v.url === null) !== (v.path === null));

/** « Déposer la version »: numbered, submitted, the label notified. */
export async function depositProviderVersion(
  input: z.input<typeof versionSchema>,
): Promise<Result<{ number: number }>> {
  const parsed = versionSchema.safeParse(input);
  if (!parsed.success) return failure("one_media");
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("deposit_production_version", {
    p_token: v.token,
    p_url: v.url,
    p_path: v.path,
    p_file_name: v.fileName,
    p_notes: v.notes,
  });
  if (error || data === null) return failure(error?.message);
  await schedulePendingPushes();
  revalidatePath(`/p/${v.token}`);
  return { ok: true, number: data };
}

const exportSchema = z.object({
  token,
  lineId: z.uuid(),
  url: z.string().trim().max(2000),
});

/** « Déposer » an expected export's link. */
export async function depositProviderExport(
  input: z.input<typeof exportSchema>,
): Promise<Result> {
  const parsed = exportSchema.safeParse(input);
  if (!parsed.success) return failure("invalid_url");
  const supabase = await createClient();
  const { error } = await supabase.rpc("deposit_production_export", {
    p_token: parsed.data.token,
    p_line_id: parsed.data.lineId,
    p_url: parsed.data.url,
  });
  if (error) return failure(error.message);
  await schedulePendingPushes();
  revalidatePath(`/p/${parsed.data.token}`);
  return { ok: true };
}

const locationSchema = z.object({
  token,
  optionId: z.uuid(),
  verdict: z.enum(["favorable", "reserved", "unfavorable"]),
  comment: z.string().trim().max(2000),
});

/** « Donner mon avis » on a place, from the provider's page (PROD-012). */
export async function reviewLocationByLink(
  input: z.input<typeof locationSchema>,
): Promise<Result> {
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return failure(undefined);
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_production_location_by_link", {
    p_token: p.token,
    p_option_id: p.optionId,
    p_verdict: p.verdict,
    p_comment: p.comment,
  });
  if (error) return failure(error.message);
  revalidatePath(`/p/${p.token}`);
  return { ok: true };
}
