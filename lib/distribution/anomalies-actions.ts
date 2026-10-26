"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  ANOMALY_KINDS,
  ANOMALY_MODULES,
  ANOMALY_STATES,
  SEVERITIES,
} from "@/lib/distribution/anomalies";
import type { DistributionResult } from "@/lib/distribution/result";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const e = fr.distribution.anomalies.errors;

function failure(error: {
  code?: string;
  message?: string;
}): DistributionResult {
  const message = error.message ?? "";
  if (message.includes("validation_pending"))
    return { ok: false, error: e.validationPending };
  if (message.includes("nothing_to_supersede"))
    return { ok: false, error: e.nothingToSupersede };
  if (message.includes("reason_required"))
    return { ok: false, error: e.reasonRequired };
  if (error.code === "42501") return { ok: false, error: e.forbidden };
  if (error.code === "23514") return { ok: false, error: e.invalid };
  console.error("distribution anomalies:", error.code, message);
  return { ok: false, error: e.generic };
}

function done(projectId: string): DistributionResult {
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}

const reportSchema = z.object({
  projectId: z.uuid(),
  kind: z.enum(ANOMALY_KINDS),
  description: z.string().trim().min(1).max(2000),
  platform: z.string().max(40),
  severity: z.enum(SEVERITIES),
  module: z.enum(ANOMALY_MODULES),
});

/** « Signaler une anomalie »: where it is corrected, never here (CA12). */
export async function reportDistributionAnomaly(
  input: z.input<typeof reportSchema>,
): Promise<DistributionResult> {
  await requireApproved();
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_distribution_anomaly", {
    p_project_id: v.projectId,
    p_kind: v.kind,
    p_description: v.description,
    p_platform: v.platform,
    p_severity: v.severity,
    p_source_module: v.module,
  });
  return error ? failure(error) : done(v.projectId);
}

const stateSchema = z.object({
  projectId: z.uuid(),
  anomalyId: z.uuid(),
  state: z.enum(ANOMALY_STATES),
  note: z.string().trim().max(1000),
});

/** Follows an anomaly: being corrected, resolved or dismissed (why). */
export async function setDistributionAnomalyState(
  input: z.input<typeof stateSchema>,
): Promise<DistributionResult> {
  await requireApproved();
  const parsed = stateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const v = parsed.data;
  if ((v.state === "resolved" || v.state === "dismissed") && !v.note)
    return { ok: false, error: e.reasonRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_distribution_anomaly_state", {
    p_anomaly_id: v.anomalyId,
    p_state: v.state,
    p_note: v.note,
  });
  return error ? failure(error) : done(v.projectId);
}

/** « Préparer une nouvelle version » after a correction at the source
 * (CA13): the validated version and its cycle are kept. */
export async function prepareDistributionVersion(input: {
  projectId: string;
  note: string;
  // The modules corrected (their checks only are redone); none: all six.
  modules?: string[];
}): Promise<DistributionResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      note: z.string().trim().min(1).max(1000),
      modules: z.array(z.enum(ANOMALY_MODULES)).max(7).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: e.reasonRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("prepare_distribution_version", {
    p_project_id: parsed.data.projectId,
    p_note: parsed.data.note,
    p_modules: parsed.data.modules?.length ? parsed.data.modules : undefined,
  });
  return error ? failure(error) : done(parsed.data.projectId);
}
