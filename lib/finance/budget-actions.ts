"use server";

import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { BUDGET_FAMILIES, BUDGET_STATUSES } from "@/lib/budget/types";
import { templateLines } from "@/lib/finance/budget-queries";
import { failure, positiveEuros, refresh } from "@/lib/finance/write-helpers";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { treasury } from "@/lib/i18n/fr/treasury";
import { createClient } from "@/lib/supabase/server";
import { parisPlace } from "@/lib/utils/calendar-period";
import type { WriteResult } from "@/lib/utils/write-result";

const t = treasury.errors;
const done = financeBudgets.done;

// The envelopes' writes of Finance › Budgets (lot 4): with the session, the
// rules in SQL (20261113300101_finance_spends.sql,
// 20261113400101_finance_budgets.sql). A project's or an artist's lines
// keep their own writers: an import there is refused by RLS for anyone
// else.

const kindInput = z.enum(["project", "artist", "cost_center"]);

const centerInput = z.object({
  name: z.string().trim().min(1).max(120),
  amount: z.string(),
  templateId: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.uuid().nullable()),
});

/** « Nouveau centre de coût », empty or from a template: its envelope, and
 * the template's lines as planned spends (the envelope = their total when
 * no amount is given). */
export async function createCostCenter(
  input: z.input<typeof centerInput>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const p = centerInput.safeParse(input);
  if (!p.success || !access.organizationId)
    return { ok: false, error: t.invalid };
  const supabase = await createClient();
  let lines: ReturnType<typeof templateLines> = [];
  if (p.data.templateId) {
    const { data } = await supabase
      .from("finance_budget_templates")
      .select("lines")
      .eq("id", p.data.templateId)
      .maybeSingle();
    lines = templateLines(data?.lines);
  }
  const typed = p.data.amount.trim()
    ? positiveEuros.safeParse(p.data.amount)
    : null;
  if (typed && !typed.success) return { ok: false, error: t.invalid };
  const budget =
    typed?.data ??
    (lines.length ? lines.reduce((s, l) => s + l.cents, 0) : null);
  const { data: center, error } = await supabase
    .from("finance_cost_centers")
    .insert({
      organization_id: access.organizationId,
      name: p.data.name,
      budget_cents: budget,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505")
      return { ok: false, error: financeBudgets.errors.nameTaken };
    return failure(error, "createCostCenter");
  }
  const organizationId = access.organizationId;
  if (lines.length) {
    const today = parisPlace(new Date()).day;
    const { error: linesError } = await supabase.from("budget_lines").insert(
      lines.map((l) => ({
        organization_id: organizationId,
        cost_center_id: center.id,
        label: l.label,
        amount_cents: l.cents,
        family: l.family,
        family_detail: l.family === "other" ? l.label.slice(0, 120) : null,
        subpost: l.subpost,
        status: "planned",
        spent_on: today,
      })),
    );
    if (linesError) return failure(linesError, "createCostCenter (lines)");
  }
  refresh();
  return { ok: true, done: done.center };
}

const reviseInput = z.object({
  id: z.uuid(),
  amount: positiveEuros,
  reason: z.string().trim().min(1).max(500),
});

/** « Réviser l'enveloppe » of a cost center, with its reason (traced). */
export async function reviseCostCenter(
  input: z.input<typeof reviseInput>,
): Promise<WriteResult> {
  await requireApproved();
  const p = reviseInput.safeParse(input);
  if (!p.success) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("revise_cost_center", {
    p_id: p.data.id,
    p_cents: p.data.amount,
    p_reason: p.data.reason,
  });
  if (error) return failure(error, "reviseCostCenter");
  refresh();
  return { ok: true, done: done.revised };
}

const shareInput = z.object({
  kind: kindInput,
  id: z.uuid(),
  percent: z.number().min(0).max(100),
});

/** « Part financée par PDS », 0 to 100 % (J4Y in the ticket). */
export async function setPdsShare(
  input: z.input<typeof shareInput>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const p = shareInput.safeParse(input);
  if (!p.success || !access.organizationId)
    return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { error } = await supabase.from("finance_envelope_shares").upsert(
    {
      organization_id: access.organizationId,
      target_kind: p.data.kind,
      target_id: p.data.id,
      pds_share_bp: Math.round(p.data.percent * 100),
    },
    { onConflict: "organization_id,target_kind,target_id" },
  );
  if (error) return failure(error, "setPdsShare");
  refresh();
  return { ok: true, done: done.share };
}

const templateInput = z.object({
  name: z.string().trim().min(1).max(120),
  lines: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(200),
        family: z.enum(BUDGET_FAMILIES).nullable(),
        subpost: z.string().trim().max(120).nullable(),
        cents: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(200),
});

/** « Enregistrer comme modèle »: an envelope's lines, to copy into the
 * next emission, live or shooting. */
export async function saveTemplate(
  input: z.input<typeof templateInput>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const p = templateInput.safeParse(input);
  if (!p.success || !access.organizationId)
    return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { error } = await supabase.from("finance_budget_templates").insert({
    organization_id: access.organizationId,
    name: p.data.name,
    lines: p.data.lines.map((l) => ({
      label: l.label,
      family: l.family,
      subpost: l.subpost,
      amount_cents: l.cents,
    })),
  });
  if (error) return failure(error, "saveTemplate");
  refresh();
  return { ok: true, done: done.template };
}

const importInput = z.object({
  kind: kindInput,
  id: z.uuid(),
  rows: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(200),
        family: z.enum(BUDGET_FAMILIES).nullable(),
        familyDetail: z.string().trim().max(120).nullable(),
        subpost: z.string().trim().max(120).nullable(),
        cents: z.number().int().min(0),
        supplier: z.string().trim().max(200).nullable(),
        dueOn: z.iso.date().nullable(),
        status: z.enum(BUDGET_STATUSES),
      }),
    )
    .min(1)
    .max(500),
});

/** « Importer des lignes »: the rows read from a pasted table, each a
 * spend of the envelope (its writer only: RLS). */
export async function importBudgetLines(
  input: z.input<typeof importInput>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const p = importInput.safeParse(input);
  if (!p.success || !access.organizationId)
    return { ok: false, error: t.invalid };
  if (p.data.kind === "cost_center" && !can(access, "manage_finance"))
    return { ok: false, error: t.forbidden };
  const owner =
    p.data.kind === "project"
      ? { project_id: p.data.id }
      : p.data.kind === "artist"
        ? { artist_id: p.data.id }
        : { cost_center_id: p.data.id };
  const today = parisPlace(new Date()).day;
  const organizationId = access.organizationId;
  const supabase = await createClient();
  const { error } = await supabase.from("budget_lines").insert(
    p.data.rows.map((r) => ({
      ...owner,
      organization_id: organizationId,
      label: r.label,
      amount_cents: r.cents,
      family: r.family,
      family_detail:
        r.family === "other" ? (r.familyDetail ?? r.label.slice(0, 120)) : null,
      subpost: r.subpost,
      supplier_name: r.supplier,
      due_on: r.dueOn,
      status: r.status,
      spent_on: r.dueOn ?? today,
    })),
  );
  if (error) return failure(error, "importBudgetLines");
  refresh();
  return { ok: true, done: done.imported(p.data.rows.length) };
}
