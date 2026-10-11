"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { CLOSURE_DECISIONS } from "@/lib/marketing/closure/status";
import { marketingFailure } from "@/lib/marketing/result";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// Écran 5 (ticket « Suivi & bilan »): asking for the Marketing closing,
// deciding it, reopening it. The database checks the reserves again and who
// may (owner asks, holder of « validate » decides and reopens, never the
// person who asked).

const e = fr.marketingReview.decision.errors;

function failure(error: { code?: string; message?: string }): WriteResult {
  const m = error.message ?? "";
  const known: [string, string][] = [
    ["already_closed", e.alreadyClosed],
    ["closure_pending", e.pending],
    ["report_not_reference", e.notReference],
    ["reserves_unarbitrated", e.unarbitrated],
    ["reserves_blocking", e.blocking],
    ["reserves_remaining", e.remaining],
    ["no_reserves", e.noReserves],
    ["self_approval", e.selfApproval],
    ["comment_required", e.commentRequired],
    ["reason_required", e.reasonRequired],
    ["no_validator", fr.marketingReview.approval.errors.noValidator],
    [
      "multiple_validators",
      fr.marketingReview.approval.errors.multipleValidators,
    ],
    ["invalid_transition", e.transition],
  ];
  const hit = known.find(([code]) => m.includes(code));
  if (hit) return { ok: false, error: hit[1] };
  if (error.code === "42501") return { ok: false, error: e.forbidden };
  return marketingFailure(error);
}

function done(projectId: string): WriteResult {
  // The chevrons, the workflow cards and the project's closing read it too.
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}

const invalid = { ok: false, error: fr.marketing.errors.invalid } as const;

const requestInput = z.object({
  projectId: z.uuid(),
  reportId: z.uuid(),
  note: z.string().trim().max(2000),
});

/** « Demander la clôture du Marketing ». */
export async function requestClosure(
  input: z.input<typeof requestInput>,
): Promise<WriteResult> {
  const p = requestInput.safeParse(input);
  if (!p.success) return invalid;
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_marketing_closure", {
    p_project_id: p.data.projectId,
    p_report_id: p.data.reportId,
    p_note: p.data.note,
  });
  return error ? failure(error) : done(p.data.projectId);
}

const decideInput = z.object({
  projectId: z.uuid(),
  closureId: z.uuid(),
  decision: z.enum(CLOSURE_DECISIONS),
  comment: z.string().trim().max(2000),
});

/** The validator's decision on the closing asked. */
export async function decideClosure(
  input: z.input<typeof decideInput>,
): Promise<WriteResult> {
  const p = decideInput.safeParse(input);
  if (!p.success) return invalid;
  const d = p.data;
  if (
    (d.decision === "changes_requested" || d.decision === "postponed") &&
    d.comment === ""
  )
    return { ok: false, error: e.commentRequired };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_marketing_closure", {
    p_closure_id: d.closureId,
    p_decision: d.decision,
    p_comment: d.comment,
  });
  return error ? failure(error) : done(d.projectId);
}

const reopenInput = z.object({
  projectId: z.uuid(),
  closureId: z.uuid(),
  reason: z.string().trim().min(1).max(2000),
});

/** « Rouvrir le Marketing », with a reason (the direction). */
export async function reopenClosure(
  input: z.input<typeof reopenInput>,
): Promise<WriteResult> {
  const p = reopenInput.safeParse(input);
  if (!p.success) return { ok: false, error: e.reasonRequired };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_marketing_closure", {
    p_closure_id: p.data.closureId,
    p_reason: p.data.reason,
  });
  return error ? failure(error) : done(p.data.projectId);
}
