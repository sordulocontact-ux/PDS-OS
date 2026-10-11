"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { CHECK_KEYS, CHECK_RESULTS } from "@/lib/distribution/checks";
import type { DistributionResult } from "@/lib/distribution/result";
import { loadDistributionView, snapshotOf } from "@/lib/distribution/view";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const e = fr.distribution.validation.errors;

/** A database refusal of the validation, in words. */
function failure(error: {
  code?: string;
  message?: string;
}): DistributionResult {
  const message = error.message ?? "";
  const known: Array<[string, string]> = [
    ["validator_invalid", e.validatorInvalid],
    ["version_open", e.versionOpen],
    ["no_validator", e.noValidator],
    ["checks_non_compliant", e.nonCompliant],
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
  const project = await getProject(parsed.data.projectId);
  if (!project || project.stages.length === 0)
    return { ok: false, error: e.generic };
  const view = await loadDistributionView(project, access);
  if (!view.gate.allowed)
    return { ok: false, error: view.gate.reasons.join(" ") };
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
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_distribution_version", {
    p_version_id: parsed.data.versionId,
    p_approve: parsed.data.approve,
    p_note: parsed.data.note,
  });
  return error ? failure(error) : done(parsed.data.projectId);
}
