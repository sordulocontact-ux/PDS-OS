"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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
  platform: platformKey,
  url: https,
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
  return withOutcome(v.projectId, ["distribution"], v.done, async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("confirm_distribution_platform", {
      p_project_id: v.projectId,
      p_platform: v.platform,
      p_url: v.url || null,
    });
    return error ? failure(error) : ok(v.projectId);
  });
}

const problemSchema = z.object({
  projectId: z.uuid(),
  platform: platformKey,
  problem: z.enum(["unavailable", "non_compliant"]),
  note: z.string().trim().min(1).max(1000),
  module: z.enum(ANOMALY_MODULES),
  url: https,
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
  return withOutcome(v.projectId, ["distribution"], v.done, async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc(
      "report_distribution_platform_problem",
      {
        p_project_id: v.projectId,
        p_platform: v.platform,
        p_problem: v.problem,
        p_note: v.note,
        p_module: v.module,
        p_url: v.url || null,
      },
    );
    return error ? failure(error) : ok(v.projectId);
  });
}
