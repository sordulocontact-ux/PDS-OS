"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  CLOSURE_KINDS,
  CRITICALITIES,
  REASON_KINDS,
} from "@/lib/distribution/closure";
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
    ["not_accepted", e.notAccepted],
    ["reason_kind_required", e.reasonKindRequired],
    ["reserves_invalid", e.reservesInvalid],
    ["not_direction", e.notDirection],
    ["not_open", e.notOpen],
    ["not_requested", e.notRequested],
    ["same_person", e.samePerson],
    ["proof_required", e.proofRequired],
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

const reserveInput = z.object({
  cause: z.enum([
    "distributor",
    "availability",
    "compliance",
    "checks",
    "anomalies",
  ]),
  ownerPersonId: z.uuid(),
  dueOn: z.iso.date(),
  expectedProof: z.string().trim().min(1).max(500),
  criticality: z.enum(CRITICALITIES),
});

const proposeSchema = z.object({
  projectId: z.uuid(),
  kind: z.enum(CLOSURE_KINDS),
  arbitration: z.string().trim().max(2000),
  acknowledged: z.boolean(),
  // Ahead of time (cancelled, abandoned, before the acceptance).
  reasonKind: z.enum(REASON_KINDS).nullable().default(null),
  // What the owner says of each reserve the code computed.
  reserves: z.array(reserveInput).max(5).default([]),
});

/** Proposes the closure (CA14-CA15, recette DIST-003). The reserves are
 * computed here, from the sources read now, never sent by the browser;
 * the browser only says who follows each one, by when, with what proof. */
export async function proposeDistributionClosure(
  input: z.input<typeof proposeSchema>,
): Promise<DistributionResult> {
  const access = await requireApproved();
  const parsed = proposeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const v = parsed.data;
  if (v.kind !== "normal" && !v.arbitration)
    return { ok: false, error: e.reasonRequired };
  if (v.kind === "reserves" && !v.acknowledged)
    return { ok: false, error: e.reasonRequired };
  if ((v.kind === "cancelled" || v.kind === "abandoned") && !v.reasonKind)
    return { ok: false, error: e.reasonKindRequired };
  const project = await getProject(v.projectId);
  if (!project || project.stages.length === 0)
    return { ok: false, error: e.generic };
  const view = await loadClosureView(project, access);
  if (v.kind === "normal" && !view.readiness.normalPossible)
    return { ok: false, error: e.conditionsNotMet };
  if (v.kind === "reserves" && view.readiness.reserves.length === 0)
    return { ok: false, error: e.invalid };
  if (v.kind === "reserves" && !view.readiness.accepted && !v.reasonKind)
    return { ok: false, error: e.notAccepted };
  const reserves = view.readiness.reserves.map((reserve) => {
    const said = v.reserves.find((r) => r.cause === reserve.cause);
    return said
      ? {
          ...reserve,
          criticality: said.criticality,
          ownerPersonId: said.ownerPersonId,
          dueOn: said.dueOn,
          expectedProof: said.expectedProof,
        }
      : null;
  });
  if (v.kind === "reserves" && reserves.some((r) => r === null))
    return { ok: false, error: e.reservesInvalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("propose_distribution_closure", {
    p_project_id: project.id,
    p_kind: v.kind,
    p_reserves: (v.kind === "reserves" ? reserves : []) as unknown as Json,
    p_arbitration: v.kind === "normal" ? "" : v.arbitration,
    p_reason_kind:
      v.kind === "normal" || (v.kind === "reserves" && view.readiness.accepted)
        ? undefined
        : (v.reasonKind ?? undefined),
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

const liftSchema = z.object({
  projectId: z.uuid(),
  reserveId: z.uuid(),
  note: z.string().trim().max(1000),
  proofPath: z.string().max(300),
  proofName: z.string().trim().max(255),
  proofUrl: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => value === "" || /^https:\/\/\S+\.\S+$/.test(value)),
});

/** « Demander la levée » of a reserve, with its proof (DIST-007). */
export async function requestReserveLift(
  input: z.input<typeof liftSchema>,
): Promise<DistributionResult> {
  await requireApproved();
  const parsed = liftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const v = parsed.data;
  if (!v.proofPath && !v.proofUrl) return { ok: false, error: e.proofRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_distribution_reserve_lift", {
    p_reserve_id: v.reserveId,
    p_note: v.note,
    p_proof_path: v.proofPath,
    p_proof_name: v.proofName,
    p_proof_url: v.proofUrl,
  });
  return error ? failure(error) : done(v.projectId);
}

const liftDecisionSchema = z.object({
  projectId: z.uuid(),
  reserveId: z.uuid(),
  approve: z.boolean(),
  note: z.string().trim().max(1000),
});

/** « Confirmer la levée » / « Refuser », by another person. */
export async function decideReserveLift(
  input: z.input<typeof liftDecisionSchema>,
): Promise<DistributionResult> {
  await requireApproved();
  const parsed = liftDecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const v = parsed.data;
  if (!v.approve && !v.note) return { ok: false, error: e.reasonRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_distribution_reserve_lift", {
    p_reserve_id: v.reserveId,
    p_approve: v.approve,
    p_note: v.note,
  });
  return error ? failure(error) : done(v.projectId);
}
