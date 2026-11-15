"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import {
  cents,
  failure,
  optionalId,
  positiveEuros,
  refresh,
} from "@/lib/finance/write-helpers";
import { fundings } from "@/lib/i18n/fr/fundings";
import { treasury } from "@/lib/i18n/fr/treasury";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = treasury.errors;
const done = fundings.done;

// Finance › Financements (lot 5): the facts the engines compute from, with
// the session; the rules in SQL (20261113500101_finance_fundings.sql).

async function organization() {
  const access = await requireApproved();
  return access.organizationId;
}

const settingsInput = z.object({
  tranche: z.string().transform((v, ctx) => {
    const c = cents(v);
    if (c === null || c < 0) {
      ctx.addIssue({ code: "custom" });
      return z.NEVER;
    }
    return c;
  }),
  per: z.number().int().min(1).max(1000),
  counted: z.number().int().min(0).max(100000),
});

/** The Orchard rule and the titles counted since its last advance. */
export async function saveEngineSettings(
  input: z.input<typeof settingsInput>,
): Promise<WriteResult> {
  const organizationId = await organization();
  const p = settingsInput.safeParse(input);
  if (!p.success || !organizationId) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { error } = await supabase.from("finance_engine_settings").upsert(
    {
      organization_id: organizationId,
      orchard_tranche_cents: p.data.tranche,
      orchard_titles_per_tranche: p.data.per,
      orchard_titles_counted: p.data.counted,
    },
    { onConflict: "organization_id" },
  );
  if (error) return failure(error, "saveEngineSettings");
  refresh();
  return { ok: true, done: done.settings };
}

const formatInput = z.object({
  name: z.string().trim().min(1).max(80),
  cost: positiveEuros,
  titles: z.number().int().min(0).max(100),
});

/** « Nouveau format »: PDS MIC, PDS SHOW, PDS VERSUS… */
export async function createShowFormat(
  input: z.input<typeof formatInput>,
): Promise<WriteResult> {
  const organizationId = await organization();
  const p = formatInput.safeParse(input);
  if (!p.success || !organizationId) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { error } = await supabase.from("finance_show_formats").insert({
    organization_id: organizationId,
    name: p.data.name,
    cost_cents: p.data.cost,
    provisional_titles: p.data.titles,
  });
  if (error) return failure(error, "createShowFormat");
  refresh();
  return { ok: true, done: done.format };
}

const showInput = z.object({
  id: z.uuid().optional(),
  formatId: z.uuid(),
  label: z.string().trim().min(1).max(120),
  plannedOn: z.iso.date(),
});

/** A show planned on a day, or moved to another (the forecast follows). */
export async function saveShow(
  input: z.input<typeof showInput>,
): Promise<WriteResult> {
  const organizationId = await organization();
  const p = showInput.safeParse(input);
  if (!p.success || !organizationId) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const row = {
    format_id: p.data.formatId,
    label: p.data.label,
    planned_on: p.data.plannedOn,
  };
  const { error } = p.data.id
    ? await supabase.from("finance_shows").update(row).eq("id", p.data.id)
    : await supabase
        .from("finance_shows")
        .insert({ ...row, organization_id: organizationId });
  if (error) return failure(error, "saveShow");
  refresh();
  return { ok: true, done: done.show };
}

export async function cancelShow(showId: string): Promise<WriteResult> {
  await organization();
  const id = z.uuid().safeParse(showId);
  if (!id.success) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_shows")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", id.data)
    .select("id");
  if (error) return failure(error, "cancelShow");
  if (!data?.length) return { ok: false, error: t.forbidden };
  refresh();
  return { ok: true, done: done.showCancelled };
}

const lineInput = z.object({
  name: z.string().trim().min(1).max(80),
  limit: positiveEuros,
});

export async function createCreditLine(
  input: z.input<typeof lineInput>,
): Promise<WriteResult> {
  const organizationId = await organization();
  const p = lineInput.safeParse(input);
  if (!p.success || !organizationId) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { error } = await supabase.from("finance_credit_lines").insert({
    organization_id: organizationId,
    name: p.data.name,
    limit_cents: p.data.limit,
  });
  if (error) return failure(error, "createCreditLine");
  refresh();
  return { ok: true, done: done.line };
}

const drawInput = z.object({
  creditLineId: z.uuid(),
  lineId: optionalId,
  label: z.string().trim().min(1).max(200),
  amount: positiveEuros,
  drawnOn: z.iso.date(),
  installments: z.number().int().min(1).max(60),
  feePercent: z.number().min(0).max(50),
});

/** « Nouveau tirage »: what the Pay Later finances (a spend, when chosen,
 * then leaves by its installments). */
export async function addCreditDraw(
  input: z.input<typeof drawInput>,
): Promise<WriteResult> {
  const organizationId = await organization();
  const p = drawInput.safeParse(input);
  if (!p.success || !organizationId) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { error } = await supabase.from("finance_credit_draws").insert({
    organization_id: organizationId,
    credit_line_id: p.data.creditLineId,
    line_id: p.data.lineId,
    label: p.data.label,
    amount_cents: p.data.amount,
    drawn_on: p.data.drawnOn,
    installments: p.data.installments,
    fee_bp: Math.round(p.data.feePercent * 100),
  });
  if (error) return failure(error, "addCreditDraw");
  refresh();
  return { ok: true, done: done.draw };
}

export async function removeCreditDraw(drawId: string): Promise<WriteResult> {
  await organization();
  const id = z.uuid().safeParse(drawId);
  if (!id.success) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_credit_draws")
    .delete()
    .eq("id", id.data)
    .select("id");
  if (error) return failure(error, "removeCreditDraw");
  if (!data?.length) return { ok: false, error: t.forbidden };
  refresh();
  return { ok: true, done: done.drawRemoved };
}
