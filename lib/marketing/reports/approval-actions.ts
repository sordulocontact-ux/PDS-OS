"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { APPROVAL_DECISIONS } from "@/lib/marketing/reports/model";
import { marketingFailure } from "@/lib/marketing/result";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// Écran 3 (ticket « Suivi & bilan »): submitting a version, then the
// validator's decision on that precise version. Who may do what is decided
// by the database (owner submits, holder of « validate » decides, never on a
// version they prepared).

const e = fr.marketingReview.approval.errors;

function failure(
  error: { code?: string; message?: string },
  forbidden: string,
): WriteResult {
  const m = error.message ?? "";
  if (m.includes("report_superseded"))
    return { ok: false, error: e.superseded };
  if (m.includes("self_approval")) return { ok: false, error: e.selfApproval };
  if (m.includes("comment_required"))
    return { ok: false, error: e.commentRequired };
  if (m.includes("no_validator")) return { ok: false, error: e.noValidator };
  if (m.includes("multiple_validators"))
    return { ok: false, error: e.multipleValidators };
  if (m.includes("invalid_transition"))
    return { ok: false, error: e.transition };
  if (error.code === "42501") return { ok: false, error: forbidden };
  return marketingFailure(error);
}

function done(projectId: string): WriteResult {
  revalidatePath(routes.projectReview(projectId), "layout");
  return { ok: true };
}

const submitInput = z.object({ projectId: z.uuid(), reportId: z.uuid() });

/** « Soumettre à validation ». */
export async function submitReport(
  input: z.input<typeof submitInput>,
): Promise<WriteResult> {
  const p = submitInput.safeParse(input);
  if (!p.success) return { ok: false, error: fr.marketing.errors.invalid };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_marketing_report", {
    p_report_id: p.data.reportId,
  });
  return error ? failure(error, e.submitForbidden) : done(p.data.projectId);
}

const decideInput = z.object({
  projectId: z.uuid(),
  reportId: z.uuid(),
  version: z.number().int().positive(),
  decision: z.enum(APPROVAL_DECISIONS),
  comment: z.string().trim().max(2000),
});

/** The validator's decision, on the version they read (`version`). */
export async function decideReport(
  input: z.input<typeof decideInput>,
): Promise<WriteResult> {
  const p = decideInput.safeParse(input);
  if (!p.success) return { ok: false, error: fr.marketing.errors.invalid };
  if (p.data.decision !== "approved_provisional" && p.data.comment === "")
    return { ok: false, error: e.commentRequired };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_marketing_report", {
    p_report_id: p.data.reportId,
    p_expected_version: p.data.version,
    p_decision: p.data.decision,
    p_comment: p.data.comment,
  });
  return error ? failure(error, e.forbidden) : done(p.data.projectId);
}
