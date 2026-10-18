"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { schedulePendingPushes } from "@/lib/notifications/push";
import {
  prepDone,
  prepFailure,
  type PrepResult,
} from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

import { QUOTE_CHECKS } from "./check";

const e = fr.productionQuotes.errors;
const invalid: PrepResult = {
  ok: false,
  error: fr.productionPrep.errors.invalid,
};

function failure(error: { message?: string; code?: string }): PrepResult {
  const key = (Object.keys(e) as (keyof typeof e)[]).find((k) =>
    error.message?.includes(k),
  );
  return key ? { ok: false, error: e[key] } : prepFailure(error);
}

const addSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  label: z.string().trim().min(1).max(200),
  amount: z.string().trim().min(1),
  deliveryOn: z.iso.date().or(z.literal("")),
  url: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v)),
  note: z.string().trim().max(1000),
});

/** « Ajouter un devis » (the line producer or the owner). */
export async function addQuote(
  input: z.input<typeof addSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return {
      ok: false,
      error:
        field === "label"
          ? e.label
          : field === "url"
            ? e.url
            : field === "amount"
              ? e.amount
              : fr.productionPrep.errors.invalid,
    };
  }
  const p = parsed.data;
  const cents = parseEurosToCents(p.amount);
  if (cents === undefined || cents === null)
    return { ok: false, error: e.amount };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_production_quote", {
    p_sheet_id: p.sheetId,
    p_label: p.label,
    p_amount_cents: cents,
    p_delivery_on: p.deliveryOn || null,
    p_url: p.url || null,
    p_note: p.note || null,
  });
  return error ? failure(error) : prepDone(p.projectId);
}

const submitSchema = z.object({
  projectId: z.uuid(),
  quoteId: z.uuid(),
  checks: z.array(z.enum(QUOTE_CHECKS)),
  note: z.string().trim().max(1000),
});

/** « Soumettre » once every point is checked (the database checks again). */
export async function submitQuote(
  input: z.input<typeof submitSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  // Said after the gesture: who validates now (rule 7).
  return withOutcome(
    p.projectId,
    ["marketing"],
    fr.productionQuotes.done.submitted,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("submit_production_quote", {
        p_quote_id: p.quoteId,
        p_checks: Object.fromEntries(
          QUOTE_CHECKS.map((k) => [k, p.checks.includes(k)]),
        ),
        p_note: p.note || null,
      });
      if (error) return failure(error);
      await schedulePendingPushes();
      return prepDone(p.projectId);
    },
  );
}

const decideSchema = z.object({
  projectId: z.uuid(),
  quoteId: z.uuid(),
  approve: z.boolean(),
  reason: z.string().trim().max(1000),
});

/** « Valider le devis » / « Refuser » (its validator only). */
export async function decideQuote(
  input: z.input<typeof decideSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  if (!p.approve && !p.reason) return { ok: false, error: e.reason_required };
  const done = fr.productionQuotes.done;
  // Said after the gesture: what opened, who acts now (rule 7).
  return withOutcome(
    p.projectId,
    ["marketing"],
    p.approve ? done.approved : done.rejected,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("decide_production_quote", {
        p_quote_id: p.quoteId,
        p_approve: p.approve,
        p_reason: p.reason || null,
      });
      if (error) return failure(error);
      await schedulePendingPushes();
      return prepDone(p.projectId);
    },
  );
}
