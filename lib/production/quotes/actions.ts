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
  loc: z.string().trim(),
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
  const loc = p.loc ? parseEurosToCents(p.loc) : null;
  if (loc === undefined) return { ok: false, error: e.loc };
  if (loc !== null && loc > cents) return { ok: false, error: e.locOver };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_production_quote", {
    p_loc_budget_cents: loc ?? undefined,
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
  number: z.number().int().positive(),
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
    fr.productionQuotes.done.submitted(p.number),
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
  number: z.number().int().positive(),
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
    p.approve ? done.approved(p.number) : done.rejected(p.number),
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

const changesSchema = z.object({
  projectId: z.uuid(),
  quoteId: z.uuid(),
  number: z.number().int().positive(),
  comment: z.string().trim().min(1).max(1000),
});

/** « Demander une modification » (the line producer while checking, the
 * budget validation while deciding): the company reads the comment. */
export async function requestQuoteChanges(
  input: z.input<typeof changesSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = changesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.reason_required };
  const p = parsed.data;
  return withOutcome(
    p.projectId,
    ["marketing"],
    fr.productionQuotes.done.changes(p.number),
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("request_production_quote_changes", {
        p_quote_id: p.quoteId,
        p_comment: p.comment,
      });
      if (error) return failure(error);
      await schedulePendingPushes();
      return prepDone(p.projectId);
    },
  );
}

const revisionSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  reason: z.string().trim().min(1).max(1000),
});

/** « Demander une révision du devis »: the validated version stays the
 * reference until a new one is validated. */
export async function requestQuoteRevision(
  input: z.input<typeof revisionSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = revisionSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionQuotes.revision.reasonRequired };
  const p = parsed.data;
  return withOutcome(
    p.projectId,
    ["marketing"],
    fr.productionQuotes.done.revision,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc(
        "request_production_quote_revision",
        { p_sheet_id: p.sheetId, p_reason: p.reason },
      );
      if (error) return failure(error);
      return prepDone(p.projectId);
    },
  );
}
