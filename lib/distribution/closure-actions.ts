"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadClosureView } from "@/lib/distribution/closure-queries";
import type { DistributionResult } from "@/lib/distribution/result";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const e = fr.distribution.closure.errors;

function failure(error: {
  code?: string;
  message?: string;
}): DistributionResult {
  const message = error.message ?? "";
  const known: Array<[string, string]> = [
    ["no_validator", e.noValidator],
    ["not_deposited", e.notDeposited],
    ["closure_open", e.closureOpen],
    ["conditions_not_met", e.conditionsNotMet],
    ["not_the_validator", e.notValidator],
    ["already_decided", e.alreadyDecided],
    ["reason_required", e.reasonRequired],
    ["not_closed", e.notClosed],
  ];
  const hit = known.find(([code]) => message.includes(code));
  if (hit) return { ok: false, error: hit[1] };
  if (error.code === "42501") return { ok: false, error: e.forbidden };
  if (error.code === "23514") return { ok: false, error: e.invalid };
  console.error("distribution closure:", error.code, message);
  return { ok: false, error: e.generic };
}

function done(projectId: string): DistributionResult {
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}

const proposeSchema = z.object({
  projectId: z.uuid(),
  kind: z.enum(["normal", "reserves"]),
  arbitration: z.string().trim().max(2000),
  acknowledged: z.boolean(),
});

/** Proposes the closure (CA14-CA15). The reserves are computed here, from
 * the sources read now, never sent by the browser. */
export async function proposeDistributionClosure(
  input: z.input<typeof proposeSchema>,
): Promise<DistributionResult> {
  const access = await requireApproved();
  const parsed = proposeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const v = parsed.data;
  if (v.kind === "reserves" && (!v.arbitration || !v.acknowledged))
    return { ok: false, error: e.reasonRequired };
  const project = await getProject(v.projectId);
  if (!project || project.stages.length === 0)
    return { ok: false, error: e.generic };
  const view = await loadClosureView(project, access);
  if (v.kind === "normal" && !view.readiness.normalPossible)
    return { ok: false, error: e.conditionsNotMet };
  if (v.kind === "reserves" && view.readiness.reserves.length === 0)
    return { ok: false, error: e.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("propose_distribution_closure", {
    p_project_id: project.id,
    p_kind: v.kind,
    p_reserves: (v.kind === "reserves"
      ? view.readiness.reserves
      : []) as unknown as Json,
    p_arbitration: v.kind === "reserves" ? v.arbitration : "",
  });
  return error ? failure(error) : done(project.id);
}

const decideSchema = z.object({
  projectId: z.uuid(),
  closureId: z.uuid(),
  approve: z.boolean(),
  note: z.string().trim().max(2000),
});

/** « Valider la clôture » / « Refuser », by the validator it waits for. */
export async function decideDistributionClosure(
  input: z.input<typeof decideSchema>,
): Promise<DistributionResult> {
  await requireApproved();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const v = parsed.data;
  if (!v.approve && !v.note) return { ok: false, error: e.reasonRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_distribution_closure", {
    p_closure_id: v.closureId,
    p_approve: v.approve,
    p_note: v.note,
  });
  return error ? failure(error) : done(v.projectId);
}

/** « Rouvrir »: a new event, the decision kept. */
export async function reopenDistributionClosure(input: {
  projectId: string;
  note: string;
}): Promise<DistributionResult> {
  await requireApproved();
  const parsed = z
    .object({ projectId: z.uuid(), note: z.string().trim().min(1).max(2000) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: e.reasonRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_distribution_closure", {
    p_project_id: parsed.data.projectId,
    p_note: parsed.data.note,
  });
  return error ? failure(error) : done(parsed.data.projectId);
}
