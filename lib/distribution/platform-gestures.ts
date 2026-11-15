"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { releaseArg } from "@/lib/distribution/scope";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { ANOMALY_MODULES } from "@/lib/distribution/anomalies";
import { REFERENCE_PLATFORMS } from "@/lib/distribution/platforms";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const e = fr.distribution.platforms.errors;
const t = fr.distributionJourney.platforms;

const platformKey = z.union([
  z.enum(REFERENCE_PLATFORMS),
  z.string().regex(/^other_[a-z0-9]{8}$/),
]);
const https = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === "" || /^https:\/\/\S+\.\S+$/.test(value));

function failure(error: { code?: string; message?: string }): WriteResult {
  const message = error.message ?? "";
  if (message.includes("no_link")) return { ok: false, error: e.noLink };
  if (message.includes("territory_required"))
    return { ok: false, error: t.territoryRequired };
  if (message.includes("proof_required"))
    return { ok: false, error: t.proofRequired };
  if (message.includes("action_required"))
    return { ok: false, error: t.actionRequired };
  if (message.includes("due_invalid"))
    return { ok: false, error: t.dueRequired };
  if (message.includes("reason_required"))
    return { ok: false, error: t.problemRequired };
  if (error.code === "42501") return { ok: false, error: e.forbidden };
  if (error.code === "23514" || error.code === "22023")
    return { ok: false, error: e.invalid };
  console.error("distribution platform:", error.code, message);
  return { ok: false, error: e.generic };
}

const ok = (projectId: string): WriteResult => {
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
};

const confirmSchema = z.object({
  projectId: z.uuid(),
  releaseId: z.uuid().nullable().optional(),
  platform: platformKey,
  url: https,
  // What the person saw (recette DIST-005): territory, day, proof.
  territory: z.string().trim().min(1).max(200),
  observedOn: z.iso.date(),
  proofPath: z.string().max(300),
  proofName: z.string().trim().max(255),
  proofUrl: https,
  done: z.string().max(200),
});

/** « Tout est bon »: the link (the detection's or the one saved),
 * available and compliant, by the person who opened it — one click. */
export async function confirmPlatform(
  input: z.input<typeof confirmSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const p = confirmSchema.safeParse(input);
  if (!p.success) return { ok: false, error: e.invalid };
  const v = p.data;
  if (!v.proofPath && !v.proofUrl) return { ok: false, error: t.proofRequired };
  return withOutcome(v.projectId, ["distribution"], v.done, async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("confirm_distribution_platform", {
      p_project_id: v.projectId,
      ...releaseArg(v.releaseId),
      p_platform: v.platform,
      p_url: v.url || null,
      p_territory: v.territory,
      p_observed_on: v.observedOn,
      p_proof_path: v.proofPath,
      p_proof_name: v.proofName,
      p_proof_url: v.proofUrl,
    });
    return error ? failure(error) : ok(v.projectId);
  });
}

const problemSchema = z.object({
  projectId: z.uuid(),
  releaseId: z.uuid().nullable().optional(),
  platform: platformKey,
  problem: z.enum(["unavailable", "non_compliant"]),
  note: z.string().trim().min(1).max(1000),
  module: z.enum(ANOMALY_MODULES),
  url: https,
  // An unavailability: what is done, by whom, by when.
  action: z.string().trim().max(1000).default(""),
  ownerPersonId: z.union([z.uuid(), z.literal("")]).default(""),
  dueOn: z.union([z.iso.date(), z.literal("")]).default(""),
  done: z.string().max(200),
});

/** « Il y a un problème »: what the person saw, and its anomaly, in one
 * gesture. */
export async function reportPlatformProblem(
  input: z.input<typeof problemSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const p = problemSchema.safeParse(input);
  if (!p.success) return { ok: false, error: t.problemRequired };
  const v = p.data;
  if (
    v.problem === "unavailable" &&
    (!v.action || !v.ownerPersonId || !v.dueOn)
  )
    return { ok: false, error: t.actionRequired };
  return withOutcome(v.projectId, ["distribution"], v.done, async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc(
      "report_distribution_platform_problem",
      {
        p_project_id: v.projectId,
        ...releaseArg(v.releaseId),
        p_platform: v.platform,
        p_problem: v.problem,
        p_note: v.note,
        p_module: v.module,
        p_url: v.url || null,
        p_action: v.action || undefined,
        p_owner_person_id: v.ownerPersonId || undefined,
        p_due_on: v.dueOn || undefined,
      },
    );
    return error ? failure(error) : ok(v.projectId);
  });
}
