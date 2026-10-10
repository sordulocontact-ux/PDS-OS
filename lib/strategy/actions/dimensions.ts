"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { id, orgId, text } from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { done } from "@/lib/strategy/actions/shared";
import { parseEurosToCents } from "@/lib/strategy/budget";
import { KPI_METRICS } from "@/lib/strategy/dimensions";
import { BUDGET_NONE_KEY } from "@/lib/strategy/queries";
import { createClient } from "@/lib/supabase/server";

// Budget stratégie, Objectifs & KPIs. Every write runs with the owner's session:
// the database decides whether the strategy is still editable.

const optional = <T extends z.ZodType>(schema: T) =>
  z.union([schema, z.literal("")]).transform((v) => (v === "" ? null : v));

const budgetInput = z.object({
  label: text(200),
  leverId: optional(id),
  amount: z.string().trim().max(30),
  state: z.enum(["validated", "to_decide"]),
});

export async function addBudgetLine(
  projectId: string,
  input: z.input<typeof budgetInput>,
): Promise<ActionResult> {
  const p = budgetInput.safeParse(input);
  const cents = p.success ? parseEurosToCents(p.data.amount) : null;
  const organizationId = await orgId();
  if (
    !p.success ||
    cents === null ||
    !organizationId ||
    !id.safeParse(projectId).success
  )
    return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("strategy_budget_lines").insert({
    organization_id: organizationId,
    project_id: projectId,
    label: p.data.label,
    lever_id: p.data.leverId,
    amount_cents: cents,
    state: p.data.state,
  });
  return done(projectId, error);
}

export async function setBudgetLineState(
  projectId: string,
  lineId: string,
  state: "validated" | "to_decide",
): Promise<ActionResult> {
  if (
    !id.safeParse(lineId).success ||
    !["validated", "to_decide"].includes(state)
  )
    return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("strategy_budget_lines")
    .update({ state })
    .eq("id", lineId)
    .eq("project_id", projectId);
  return done(projectId, error);
}

export async function removeBudgetLine(
  projectId: string,
  lineId: string,
): Promise<ActionResult> {
  if (!id.safeParse(lineId).success) return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("strategy_budget_lines")
    .delete()
    .eq("id", lineId)
    .eq("project_id", projectId);
  return done(projectId, error);
}

/** « Pas de budget dédié » (or its undoing), appended like any answer. */
export async function setBudgetNone(
  projectId: string,
  none: boolean,
): Promise<ActionResult> {
  const organizationId = await orgId();
  if (!organizationId || !id.safeParse(projectId).success)
    return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("field_values").insert({
    organization_id: organizationId,
    project_id: projectId,
    deliverable: "strategy",
    field_key: BUDGET_NONE_KEY,
    value: { none },
    status: none ? "confirmed" : "rejected",
    source_type: "manual",
  });
  return done(projectId, error);
}

const kpiInput = z
  .object({
    label: text(200),
    kind: z.enum(["quantitative", "qualitative"]),
    target: z.string().trim().max(300),
    unit: z.string().trim().max(40),
    metric: z.enum(KPI_METRICS),
  })
  .refine((v) => v.metric === "manual" || v.kind === "quantitative");

const number = (raw: string): number | null => {
  const n = Number(raw.replace(/[\s  ]/g, "").replace(",", "."));
  return raw !== "" && Number.isFinite(n) && n >= 0 && n <= 1e12 ? n : null;
};

export async function addKpi(
  projectId: string,
  input: z.input<typeof kpiInput>,
): Promise<ActionResult> {
  const p = kpiInput.safeParse(input);
  const organizationId = await orgId();
  if (!p.success || !organizationId || !id.safeParse(projectId).success)
    return fail("invalid_input");
  const quantitative = p.data.kind === "quantitative";
  const target = quantitative ? number(p.data.target) : null;
  if (quantitative && p.data.target !== "" && target === null)
    return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("strategy_kpis").insert({
    organization_id: organizationId,
    project_id: projectId,
    label: p.data.label,
    kind: p.data.kind,
    target_value: target,
    target_text: quantitative ? null : p.data.target || null,
    unit: quantitative ? p.data.unit || null : null,
    metric: p.data.metric,
  });
  return done(projectId, error);
}

export async function removeKpi(
  projectId: string,
  kpiId: string,
): Promise<ActionResult> {
  if (!id.safeParse(kpiId).success) return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("strategy_kpis")
    .delete()
    .eq("id", kpiId)
    .eq("project_id", projectId);
  return done(projectId, error);
}

/** The real value of a KPI, noted by the owner (follow-up after launch). */
export async function noteKpiActual(
  projectId: string,
  kpiId: string,
  input: { value: string; text: string },
): Promise<ActionResult> {
  if (!id.safeParse(kpiId).success) return fail("invalid_input");
  const value = input.value.trim() === "" ? null : number(input.value.trim());
  if (input.value.trim() !== "" && value === null) return fail("invalid_input");
  const actualText = input.text.trim().slice(0, 300) || null;
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("strategy_kpis")
    .update({ actual_value: value, actual_text: actualText })
    .eq("id", kpiId)
    .eq("project_id", projectId);
  return done(projectId, error);
}
