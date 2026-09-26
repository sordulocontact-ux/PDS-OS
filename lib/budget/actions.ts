"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { BUDGET_FAMILIES, BUDGET_STATUSES } from "@/lib/budget/types";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { createClient } from "@/lib/supabase/server";

// Written with the user's session: only the project's owner gets through (RLS).

const optionalId = z
  .string()
  .optional()
  .transform((v) => v || null)
  .pipe(z.uuid().nullable());

const lineInput = z.object({
  id: optionalId,
  label: z.string().trim().min(1).max(200),
  amount: z.string().transform((value, ctx) => {
    const cents = parseEurosToCents(value);
    if (cents === undefined || cents === null) {
      ctx.addIssue({ code: "custom" });
      return z.NEVER;
    }
    return cents;
  }),
  status: z.enum(BUDGET_STATUSES),
  family: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.enum(BUDGET_FAMILIES).nullable()),
  leverId: optionalId,
  note: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => v || null),
});

export type BudgetLineInput = z.input<typeof lineInput>;

function done(
  projectId: string,
  error: { code?: string; message?: string } | null,
): ActionResult {
  if (error) return fromDatabaseError(error);
  revalidatePath(routes.projectBudget(projectId));
  return ok;
}

/** Adds a line, or updates it when `id` is given. */
export async function saveBudgetLine(
  projectId: string,
  input: BudgetLineInput,
): Promise<ActionResult> {
  const p = lineInput.safeParse(input);
  const access = await requireApproved();
  if (!p.success || !z.uuid().safeParse(projectId).success)
    return fail("invalid_input");
  if (!access.organizationId) return fail("forbidden");

  const values = {
    label: p.data.label,
    amount_cents: p.data.amount,
    status: p.data.status,
    family: p.data.family,
    lever_id: p.data.leverId,
    note: p.data.note,
  };
  const supabase = await createClient();
  if (p.data.id) {
    const { data, error } = await supabase
      .from("budget_lines")
      .update(values)
      .eq("id", p.data.id)
      .eq("project_id", projectId)
      .select("id");
    // RLS hides a refused update: no row back means no right.
    if (!error && !data?.length) return fail("forbidden");
    return done(projectId, error);
  }
  const { error } = await supabase.from("budget_lines").insert({
    ...values,
    organization_id: access.organizationId,
    project_id: projectId,
  });
  return done(projectId, error);
}

export async function deleteBudgetLine(
  projectId: string,
  lineId: string,
): Promise<ActionResult> {
  if (
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(lineId).success
  )
    return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budget_lines")
    .delete()
    .eq("id", lineId)
    .eq("project_id", projectId)
    .select("id");
  if (!error && !data?.length) return fail("forbidden");
  return done(projectId, error);
}
