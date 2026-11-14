"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { CHECK_KEYS, CHECK_RESULTS } from "@/lib/distribution/checks";
import {
  DEROGATION_SCOPES,
  REFUSAL_MODULES,
} from "@/lib/distribution/validation";
import type { DistributionResult } from "@/lib/distribution/result";
import { loadDistributionView, snapshotOf } from "@/lib/distribution/view";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import { countedTitlesProject } from "@/lib/projects/counted-titles";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const e = fr.distribution.validation.errors;

/** A database refusal of the validation, in words. */
function failure(error: {
  code?: string;
  message?: string;
  details?: string | null;
}): DistributionResult {
  const message = error.message ?? "";
  // A collective (lot 12): a confirmed participation without its contract
  // signed nor an open waiver of the release; the database names them.
  if (message.includes("contract_missing"))
    return {
      ok: false,
      error: fr.participationWaivers.refused.release(
        error.details || fr.participationWaivers.refused.someone,
      ),
    };
  const known: Array<[string, string]> = [
    ["params_not_confirmed", e.paramsNotConfirmed],
    ["legal_blockers", e.legalBlockers],
    ["validator_invalid", e.validatorInvalid],
    ["version_open", e.versionOpen],
    ["no_validator", e.noValidator],
    ["checks_non_compliant", e.nonCompliant],
    ["checks_unrecorded", e.checksUnrecorded],
    ["refusal_unresolved", e.refusalUnresolved],
    ["anomalies_unresolved", e.anomaliesUnresolved],
    ["modules_required", e.modulesRequired],
    ["scope_required", e.scopeRequired],
    ["due_invalid", e.dueInvalid],
    ["no_derogation", e.noDerogation],
    ["not_the_validator", e.notValidator],
    ["already_decided", e.alreadyDecided],
    ["reason_required", e.reasonRequired],
    ["version_not_found", e.generic],
  ];
  const hit = known.find(([code]) => message.includes(code));
  if (hit) return { ok: false, error: hit[1] };
  if (error.code === "42501") return { ok: false, error: e.forbidden };
  if (error.code === "23514") return { ok: false, error: e.invalid };
  console.error("distribution validation:", error.code, message);
  return { ok: false, error: e.generic };
}

function done(projectId: string): DistributionResult {
  // The sidebar's status and every step follow the validation.
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}

const ids = z.object({ projectId: z.uuid() });

/** « Désigner le validateur »: a holder of `validate`, not the owner. */
export async function setDistributionValidator(input: {
  projectId: string;
  personId: string;
}): Promise<DistributionResult> {
  await requireApproved();
  const parsed = ids.extend({ personId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_distribution_validator", {
    p_project_id: parsed.data.projectId,
    p_person_id: parsed.data.personId,
  });
  return error ? failure(error) : done(parsed.data.projectId);
}

const checkSchema = ids.extend({
  key: z.enum(CHECK_KEYS),
  result: z.enum(CHECK_RESULTS),
  note: z.string().trim().max(1000),
});

/** One of the six checks, recorded by the owner or the validator. */
export async function recordDistributionCheck(
  input: z.input<typeof checkSchema>,
): Promise<DistributionResult> {
  await requireApproved();
  const parsed = checkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  if (parsed.data.result === "non_compliant" && !parsed.data.note)
    return { ok: false, error: e.noteRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_distribution_check", {
    p_project_id: parsed.data.projectId,
    p_key: parsed.data.key,
    p_result: parsed.data.result,
    p_note: parsed.data.note,
  });
  return error ? failure(error) : done(parsed.data.projectId);
}

/** « Soumettre à validation »: refused with the same rule as the screen;
 * the snapshot is built here, from the sources read now. */
export async function submitDistributionVersion(input: {
  projectId: string;
}): Promise<DistributionResult> {
  const access = await requireApproved();
  const parsed = ids.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const read = await getProject(parsed.data.projectId);
  // A collective's abandoned titles leave the checks (lot 9).
  const project = read ? countedTitlesProject(read) : null;
  if (!project || project.stages.length === 0)
    return { ok: false, error: e.generic };
  const view = await loadDistributionView(project, access);
  if (!view.gate.allowed)
    return {
      ok: false,
      error: [
        ...view.gate.reasons,
        ...view.gate.derogable.map((d) => d.text),
      ].join(" "),
    };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_distribution_version", {
    p_project_id: project.id,
    p_snapshot: snapshotOf(view) as unknown as Json,
  });
  return error ? failure(error) : done(project.id);
}

const decideSchema = ids.extend({
  versionId: z.uuid(),
  approve: z.boolean(),
  note: z.string().trim().max(2000),
  // What a refusal names to correct (recette DIST-001).
  modules: z.array(z.enum(REFUSAL_MODULES)).max(6).default([]),
});

/** « Valider » / « Refuser » a version, by the validator it waits for. */
export async function decideDistributionVersion(
  input: z.input<typeof decideSchema>,
): Promise<DistributionResult> {
  await requireApproved();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  if (!parsed.data.approve && !parsed.data.note)
    return { ok: false, error: e.reasonRequired };
  if (!parsed.data.approve && parsed.data.modules.length === 0)
    return { ok: false, error: e.modulesRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_distribution_version", {
    p_version_id: parsed.data.versionId,
    p_approve: parsed.data.approve,
    p_note: parsed.data.note,
    p_modules: parsed.data.approve ? undefined : parsed.data.modules,
  });
  return error ? failure(error) : done(parsed.data.projectId);
}

const derogationSchema = ids.extend({
  scope: z.array(z.enum(DEROGATION_SCOPES)).min(1).max(3),
  risk: z.string().trim().min(1).max(1000),
  reason: z.string().trim().min(1).max(2000),
  dueOn: z.iso.date(),
});

/** « Accorder une dérogation »: the direction lets the next submission
 * through what it names, with the risk, the reason and a deadline. */
export async function grantDistributionDerogation(
  input: z.input<typeof derogationSchema>,
): Promise<DistributionResult> {
  await requireApproved();
  const parsed = derogationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("grant_distribution_derogation", {
    p_project_id: v.projectId,
    p_scope: v.scope,
    p_risk: v.risk,
    p_reason: v.reason,
    p_due_on: v.dueOn,
  });
  return error ? failure(error) : done(v.projectId);
}

/** « Retirer la dérogation » not used yet. */
export async function revokeDistributionDerogation(input: {
  projectId: string;
}): Promise<DistributionResult> {
  await requireApproved();
  const parsed = ids.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_distribution_derogation", {
    p_project_id: parsed.data.projectId,
  });
  return error ? failure(error) : done(parsed.data.projectId);
}
