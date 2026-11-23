"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { ENVELOPE_KINDS } from "@/lib/finance/envelopes";
import { failure, positiveEuros, refresh } from "@/lib/finance/write-helpers";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { treasury } from "@/lib/i18n/fr/treasury";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = treasury.errors;
const done = financeBudgets.done;

// The writes of a budget's parts and of removing a budget made by hand
// (retours d'Ibé du 18/11/2026), with the session: the rules and the rights
// in SQL (20261120120101_finance_budget_envelopes.sql).

/** SQL's refusals in the words of the page, else the common failure. */
function refused(error: { code?: string; message: string }, where: string) {
  if (error.code === "23505")
    return { ok: false as const, error: financeBudgets.errors.partNameTaken };
  if (error.message.includes("part_other_budget"))
    return { ok: false as const, error: financeBudgets.errors.partOther };
  return failure(error, where);
}

const partInput = z.object({
  id: z.uuid().optional(),
  kind: z.enum(ENVELOPE_KINDS),
  targetId: z.uuid(),
  name: z.string().trim().min(1).max(120),
  amount: positiveEuros,
});

/** « Ajouter un sous-budget » or change one (its name, its amount). */
export async function saveBudgetPart(
  input: z.input<typeof partInput>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const p = partInput.safeParse(input);
  if (!p.success || !access.organizationId)
    return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { error } = p.data.id
    ? await supabase
        .from("finance_budget_parts")
        .update({ name: p.data.name, amount_cents: p.data.amount })
        .eq("id", p.data.id)
    : await supabase.from("finance_budget_parts").insert({
        organization_id: access.organizationId,
        target_kind: p.data.kind,
        target_id: p.data.targetId,
        name: p.data.name,
        amount_cents: p.data.amount,
      });
  if (error) return refused(error, "saveBudgetPart");
  refresh();
  return { ok: true, done: p.data.id ? done.partSaved : done.partAdded };
}

/** « Supprimer » a part: its spends go back to « non réparti ». */
export async function deleteBudgetPart(id: string): Promise<WriteResult> {
  await requireApproved();
  const p = z.uuid().safeParse(id);
  if (!p.success) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_budget_parts")
    .delete()
    .eq("id", p.data)
    .select("id");
  if (error) return refused(error, "deleteBudgetPart");
  if (!data?.length) return { ok: false, error: t.forbidden };
  refresh();
  return { ok: true, done: done.partDeleted };
}

const attachInput = z.object({
  partId: z.uuid(),
  add: z.array(z.uuid()).max(500),
  remove: z.array(z.uuid()).max(500),
});

/** « Rattacher des dépenses »: the ticked spends join the part, the
 * unticked ones that were in it leave it. */
export async function setPartSpends(
  input: z.input<typeof attachInput>,
): Promise<WriteResult> {
  await requireApproved();
  const p = attachInput.safeParse(input);
  if (!p.success) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  if (p.data.add.length) {
    const { error } = await supabase.rpc("assign_budget_part", {
      p_line_ids: p.data.add,
      p_part_id: p.data.partId,
    });
    if (error) return refused(error, "setPartSpends (add)");
  }
  if (p.data.remove.length) {
    const { error } = await supabase.rpc("assign_budget_part", {
      p_line_ids: p.data.remove,
      p_part_id: null,
    });
    if (error) return refused(error, "setPartSpends (remove)");
  }
  refresh();
  return { ok: true, done: done.partSpends };
}

/** « Supprimer le budget » of a budget made by hand: deleted when nothing
 * uses it, archived when a spend or a planned show still does. */
export async function removeBudget(id: string): Promise<WriteResult> {
  await requireApproved();
  const p = z.uuid().safeParse(id);
  if (!p.success) return { ok: false, error: t.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remove_cost_center", {
    p_id: p.data,
  });
  if (error) return failure(error, "removeBudget");
  refresh();
  return {
    ok: true,
    done: data === "archived" ? done.archived : done.removed,
  };
}

const spendPartsInput = z.object({
  kind: z.enum(ENVELOPE_KINDS),
  targetId: z.uuid(),
  lineId: z.uuid().optional(),
});

/** The parts of the budget a spend belongs to and the one it is in, for the
 * « Sous-budget » choice of the spend form. Read with the session (the
 * Finance reads parts; anyone else gets none, so no choice is shown). */
export async function loadSpendParts(
  input: z.input<typeof spendPartsInput>,
): Promise<{ parts: { id: string; name: string }[]; current: string | null }> {
  await requireApproved();
  const p = spendPartsInput.safeParse(input);
  if (!p.success) return { parts: [], current: null };
  const supabase = await createClient();
  const [parts, lines] = await Promise.all([
    supabase
      .from("finance_budget_parts")
      .select("id, name")
      .eq("target_kind", p.data.kind)
      .eq("target_id", p.data.targetId)
      .order("created_at"),
    p.data.lineId
      ? supabase.rpc("finance_budget_part_lines")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (parts.error || lines.error) {
    console.error("loadSpendParts:", (parts.error ?? lines.error)?.message);
    return { parts: [], current: null };
  }
  const found = parts.data ?? [];
  const mine = (lines.data ?? []).find((l) => l.line_id === p.data.lineId);
  return {
    parts: found,
    current: found.some((x) => x.id === mine?.part_id)
      ? (mine?.part_id ?? null)
      : null,
  };
}
