"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadBudget } from "@/lib/budget/queries";
import {
  BUDGET_FAMILIES,
  BUDGET_STATUSES,
  type BudgetDeliverable,
  type BudgetLever,
} from "@/lib/budget/types";
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
  familyDetail: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v || null),
  leverId: optionalId,
  deliverableId: optionalId,
  attachmentFileId: optionalId,
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
  // The same line is read by the Budget page, the Strategy and its Brief.
  revalidatePath(routes.project(projectId), "layout");
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
  // « Autre » says what it is (MKT-S1-11).
  if (p.data.family === "other" && !p.data.familyDetail)
    return fail("invalid_input");
  if (!access.organizationId) return fail("forbidden");

  const values = {
    label: p.data.label,
    amount_cents: p.data.amount,
    status: p.data.status,
    family: p.data.family,
    family_detail: p.data.family === "other" ? p.data.familyDetail : null,
    lever_id: p.data.leverId,
    deliverable_id: p.data.deliverableId,
    // Kept when the form does not send one (an edit without a new file).
    ...(p.data.attachmentFileId
      ? { attachment_file_id: p.data.attachmentFileId }
      : {}),
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

/**
 * What « Ajouter une dépense » needs from anywhere in the Marketing
 * (MKT-S1-15): the project's levers and deliverables, and where a proof is
 * uploaded. Read with the user's session.
 */
export async function loadExpenseForm(projectId: string): Promise<{
  levers: BudgetLever[];
  deliverables: BudgetDeliverable[];
  organizationId: string | null;
}> {
  const access = await requireApproved();
  if (!z.uuid().safeParse(projectId).success)
    return { levers: [], deliverables: [], organizationId: null };
  const { levers, deliverables } = await loadBudget(projectId);
  return { levers, deliverables, organizationId: access.organizationId };
}
