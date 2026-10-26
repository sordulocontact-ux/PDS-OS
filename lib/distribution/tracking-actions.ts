"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { isProofPath } from "@/lib/distribution/proof-rules";
import type { DistributionResult } from "@/lib/distribution/result";
import { DECLARATION_KINDS } from "@/lib/distribution/tracking";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const e = fr.distribution.tracking.errors;

function failure(error: {
  code?: string;
  message?: string;
}): DistributionResult {
  const message = error.message ?? "";
  const known: Array<[string, string]> = [
    ["not_validated", e.notValidated],
    ["not_deposited", e.notDeposited],
    ["already_declared", e.alreadyDeclared],
    ["already_withdrawn", e.alreadyWithdrawn],
    ["date_order", e.dateOrder],
    ["deposit_in_use", e.depositInUse],
    ["reason_required", e.reasonRequired],
  ];
  const hit = known.find(([code]) => message.includes(code));
  if (hit) return { ok: false, error: hit[1] };
  if (error.code === "42501") return { ok: false, error: e.forbidden };
  if (error.code === "23514") return { ok: false, error: e.invalid };
  console.error("distribution tracking:", error.code, message);
  return { ok: false, error: e.generic };
}

function done(projectId: string): DistributionResult {
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}

const declareSchema = z.object({
  projectId: z.uuid(),
  kind: z.enum(DECLARATION_KINDS),
  declaredOn: z
    .string()
    .transform((value) => value || null)
    .pipe(z.iso.date().nullable()),
  orchardId: z.string().trim().max(100),
  note: z.string().trim().max(1000),
  proofPath: z.string().max(200),
  proofName: z.string().trim().max(255),
  proofUrl: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => value === "" || /^https:\/\/\S+$/.test(value)),
});

/** A declaration of the owner (CA06-CA09): nothing is sent to anyone. The
 * proof, if a file, was uploaded by the browser first (storage RLS). */
export async function declareDistribution(
  input: z.input<typeof declareSchema>,
): Promise<DistributionResult> {
  const access = await requireApproved();
  const parsed = declareSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const v = parsed.data;
  if (v.kind === "corrections_requested" && !v.note)
    return { ok: false, error: e.noteRequired };
  if (
    v.proofPath &&
    (!access.organizationId ||
      !isProofPath(v.proofPath, access.organizationId, v.projectId))
  )
    return { ok: false, error: e.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("declare_distribution", {
    p_project_id: v.projectId,
    p_kind: v.kind,
    p_declared_on: v.declaredOn ?? undefined,
    p_orchard_id: v.kind === "deposit" ? v.orchardId : "",
    p_note: v.note,
    p_proof_path: v.proofPath,
    p_proof_name: v.proofPath ? v.proofName : "",
    p_proof_url: v.proofUrl,
  });
  return error ? failure(error) : done(v.projectId);
}

/** « Retirer » a declaration made by mistake: kept in the history. */
export async function withdrawDistributionDeclaration(input: {
  projectId: string;
  declarationId: string;
  note: string;
}): Promise<DistributionResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      declarationId: z.uuid(),
      note: z.string().trim().min(1).max(1000),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: e.reasonRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_distribution_declaration", {
    p_declaration_id: parsed.data.declarationId,
    p_note: parsed.data.note,
  });
  return error ? failure(error) : done(parsed.data.projectId);
}
