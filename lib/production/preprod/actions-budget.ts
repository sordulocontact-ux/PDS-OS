"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { createClient } from "@/lib/supabase/server";

import {
  changed,
  forbidden,
  invalid,
  nextPosition,
  optionalText,
  preprodFailure,
  sheetOrg,
} from "./result";
import { BUDGET_CATEGORIES, PREPROD_BUDGET_STATUSES } from "./types";

// The preproduction's estimates per position (parcours 9), states Prévu →
// Engagé chosen by the person; totals are computed by code
// (lib/production/preprod/budget.ts). RLS: the owner, while Production runs.

const lineSchema = z
  .object({
    projectId: z.uuid(),
    label: z.string().trim().min(1).max(200),
    category: z.enum(BUDGET_CATEGORIES),
    amount: z.string().max(40),
    status: z.enum(PREPROD_BUDGET_STATUSES),
    equipmentId: z
      .string()
      .transform((v) => (v === "" || v === "none" ? null : v))
      .refine((v) => v === null || z.uuid().safeParse(v).success),
    note: optionalText(1000),
  })
  .transform((l, ctx) => {
    const cents = parseEurosToCents(l.amount);
    // Only « À estimer » goes without an amount (same rule as the database).
    if (cents === undefined || (cents === null && l.status !== "to_estimate")) {
      ctx.addIssue({ code: "custom", message: "amount" });
      return z.NEVER;
    }
    return { ...l, cents };
  });

const row = (l: z.output<typeof lineSchema>) => ({
  label: l.label,
  category: l.category,
  amount_cents: l.cents,
  status: l.status,
  equipment_id: l.equipmentId,
  note: l.note,
});

export async function addBudgetLine(
  input: z.input<typeof lineSchema> & { sheetId: string },
): Promise<PrepResult> {
  await requireApproved();
  const parsed = lineSchema.safeParse(input);
  const sheetId = z.uuid().safeParse(input.sheetId);
  if (!parsed.success || !sheetId.success) return invalid;
  const supabase = await createClient();
  const org = await sheetOrg(supabase, parsed.data.projectId, sheetId.data);
  if (!org) return forbidden;
  const { error } = await supabase.from("production_budget_lines").insert({
    ...row(parsed.data),
    organization_id: org,
    project_id: parsed.data.projectId,
    sheet_id: sheetId.data,
    position: await nextPosition(
      supabase,
      "production_budget_lines",
      sheetId.data,
    ),
  });
  return error ? preprodFailure(error) : prepDone(parsed.data.projectId);
}

export async function updateBudgetLine(
  input: z.input<typeof lineSchema> & { lineId: string },
): Promise<PrepResult> {
  await requireApproved();
  const parsed = lineSchema.safeParse(input);
  const lineId = z.uuid().safeParse(input.lineId);
  if (!parsed.success || !lineId.success) return invalid;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_budget_lines")
    .update(row(parsed.data))
    .eq("id", lineId.data)
    .eq("project_id", parsed.data.projectId)
    .select("id");
  if (error) return preprodFailure(error);
  return changed(data) ? prepDone(parsed.data.projectId) : forbidden;
}

const refSchema = z.object({ projectId: z.uuid(), lineId: z.uuid() });

export async function deleteBudgetLine(
  input: z.input<typeof refSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = refSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_budget_lines")
    .delete()
    .eq("id", parsed.data.lineId)
    .eq("project_id", parsed.data.projectId)
    .select("id");
  if (error) return preprodFailure(error);
  return changed(data) ? prepDone(parsed.data.projectId) : forbidden;
}
