"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadBudget } from "@/lib/budget/queries";
import {
  BUDGET_FAMILIES,
  BUDGET_STATUSES,
  type BudgetDeliverable,
  type BudgetLever,
  budgetLineTtcCents,
  type BudgetTarget,
} from "@/lib/budget/types";
import { planRebilling } from "@/lib/finance/rebilling";
import { budget } from "@/lib/i18n/fr/budget";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// Written with the user's session: a project's line by its owner, an
// artist's by whoever reads the artists' budgets (RLS, BUD 1).

const t = budget.errors;

const optionalId = z
  .string()
  .optional()
  .transform((v) => v || null)
  .pipe(z.uuid().nullable());

const targetSchema = z.union([
  z.object({
    kind: z.enum(["project", "artist", "cost_center"]),
    id: z.uuid(),
  }),
  // « Hors budget » (Finance, lot 3): no envelope.
  z.object({ kind: z.literal("off_budget"), id: z.literal("") }),
]);

/** The columns that say where a line goes, to write it and to match it. */
function ownerOf(target: z.infer<typeof targetSchema>) {
  switch (target.kind) {
    case "project":
      return { project_id: target.id };
    case "artist":
      return { artist_id: target.id };
    case "cost_center":
      return { cost_center_id: target.id };
    case "off_budget":
      return { off_budget: true };
  }
}

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
  spentOn: z.iso.date(),
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
  subpost: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v || null),
  leverId: optionalId,
  deliverableId: optionalId,
  // The proof, a file just recorded in the library of what the line
  // belongs to (the project's Files, the artist's receipts).
  attachmentFileId: optionalId,
  // The proof of a Finance spend, put by the browser in finance-files.
  proof: z
    .object({
      path: z.string().max(300),
      name: z.string().trim().min(1).max(200),
    })
    .nullable()
    .optional(),
  vatBp: z.number().int().min(0).max(10000).nullable().optional(),
  supplierContactId: optionalId,
  supplierName: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || null),
  dueOn: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.iso.date().nullable()),
  rebillable: z.boolean().optional(),
  validatorId: optionalId,
  note: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => v || null),
});

export type BudgetLineInput = z.input<typeof lineInput>;

/** The pages a line shows on: its project's or its artist's, Dépenses,
 * Finance (its treasury, its spends). */
function refresh(target: BudgetTarget) {
  // The same line is read by the Budget page, the Strategy and its Brief.
  if (target.kind === "project")
    revalidatePath(routes.project(target.id), "layout");
  if (target.kind === "artist")
    revalidatePath(routes.artist(target.id), "layout");
  revalidatePath(routes.expenses);
  revalidatePath(routes.finance, "layout");
}

function failure(error: { code?: string; message?: string }): WriteResult {
  const message = error.message ?? "";
  if (error.code === "42501" || message.includes("row-level security"))
    return { ok: false, error: t.forbidden };
  if (message.includes("line_follows_invoice"))
    return { ok: false, error: t.followsInvoice };
  console.error("budget line:", message);
  return { ok: false, error: t.generic };
}

/** Adds a line to a project or an artist, or updates it when `id` is given. */
export async function saveBudgetLine(
  target: BudgetTarget,
  input: BudgetLineInput,
): Promise<WriteResult> {
  const p = lineInput.safeParse(input);
  const where = targetSchema.safeParse(target);
  const access = await requireApproved();
  if (!p.success || !where.success) return { ok: false, error: t.invalid };
  // « Autre » says what it is (MKT-S1-11).
  if (p.data.family === "other" && !p.data.familyDetail)
    return { ok: false, error: t.invalid };
  if (!access.organizationId) return { ok: false, error: t.forbidden };
  const onProject = where.data.kind === "project";
  const finance =
    where.data.kind === "cost_center" || where.data.kind === "off_budget";
  const proof = p.data.proof;
  if (proof && !proof.path.startsWith(`${access.organizationId}/`))
    return { ok: false, error: t.invalid };

  const values = {
    label: p.data.label,
    amount_cents: p.data.amount,
    status: p.data.status,
    spent_on: p.data.spentOn,
    family: p.data.family,
    family_detail: p.data.family === "other" ? p.data.familyDetail : null,
    subpost: p.data.subpost,
    // Levers and deliverables are a project's.
    lever_id: onProject ? p.data.leverId : null,
    deliverable_id: onProject ? p.data.deliverableId : null,
    // Kept when the form does not send one (an edit without a new file).
    ...(p.data.attachmentFileId
      ? onProject
        ? { attachment_file_id: p.data.attachmentFileId }
        : { artist_attachment_file_id: p.data.attachmentFileId }
      : {}),
    note: p.data.note,
    vat_bp: p.data.vatBp ?? null,
    supplier_contact_id: p.data.supplierContactId,
    // A name only when no contact is linked (PersonPickerField).
    supplier_name: p.data.supplierContactId ? null : p.data.supplierName,
    due_on: p.data.dueOn,
    rebillable: p.data.rebillable ?? false,
    validator_person_id: p.data.validatorId,
    ...(finance && proof !== undefined
      ? { proof_path: proof?.path ?? null, proof_name: proof?.name ?? null }
      : {}),
  };
  const owner = ownerOf(where.data);
  const supabase = await createClient();
  let lineId: string;
  if (p.data.id) {
    const { data, error } = await supabase
      .from("budget_lines")
      .update(values)
      .eq("id", p.data.id)
      .match(owner)
      .select("id");
    if (error) return failure(error);
    // RLS hides a refused update: no row back means no right.
    if (!data?.length) return { ok: false, error: t.forbidden };
    lineId = data[0].id;
  } else {
    const { data, error } = await supabase
      .from("budget_lines")
      .insert({ ...values, ...owner, organization_id: access.organizationId })
      .select("id")
      .single();
    if (error) return failure(error);
    lineId = data.id;
  }
  if (values.rebillable && can(access, "manage_finance"))
    await planRebilling(supabase, access.organizationId, lineId, {
      label: p.data.label,
      cents: budgetLineTtcCents(p.data.amount, values.vat_bp),
      projectId: where.data.kind === "project" ? where.data.id : null,
      artistId: where.data.kind === "artist" ? where.data.id : null,
      expectedOn: p.data.dueOn ?? p.data.spentOn,
    });
  refresh(where.data);
  return { ok: true };
}

export async function deleteBudgetLine(
  target: BudgetTarget,
  lineId: string,
): Promise<WriteResult> {
  const where = targetSchema.safeParse(target);
  if (!where.success || !z.uuid().safeParse(lineId).success)
    return { ok: false, error: t.invalid };
  await requireApproved();
  const supabase = await createClient();
  const owner = ownerOf(where.data);
  const { data, error } = await supabase
    .from("budget_lines")
    .delete()
    .eq("id", lineId)
    .match(owner)
    .select("artist_attachment_file_id");
  if (error) return failure(error);
  if (!data?.length) return { ok: false, error: t.forbidden };
  // An artist's receipt belongs to its spend only: it goes with it (the
  // project's proofs stay in the project's Files, where they are seen).
  const receipt = data[0].artist_attachment_file_id;
  if (receipt) {
    const { data: file } = await supabase
      .from("artist_files")
      .delete()
      .eq("id", receipt)
      .eq("category", "receipt")
      .select("path")
      .maybeSingle();
    if (file) await supabase.storage.from("artist-files").remove([file.path]);
  }
  refresh(where.data);
  return { ok: true };
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
