"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  COMPLIANCES,
  REFERENCE_PLATFORMS,
  VERIFICATIONS,
} from "@/lib/distribution/platforms";
import type { DistributionResult } from "@/lib/distribution/result";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const e = fr.distribution.platforms.errors;

function failure(error: {
  code?: string;
  message?: string;
}): DistributionResult {
  const message = error.message ?? "";
  if (message.includes("no_link")) return { ok: false, error: e.noLink };
  if (error.code === "42501") return { ok: false, error: e.forbidden };
  if (error.code === "23514") return { ok: false, error: e.invalid };
  console.error("distribution platforms:", error.code, message);
  return { ok: false, error: e.generic };
}

function done(projectId: string): DistributionResult {
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}

const platformKey = z.union([
  z.enum(REFERENCE_PLATFORMS),
  z.string().regex(/^other_[a-z0-9]{8}$/),
]);
const httpsOrEmpty = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === "" || /^https:\/\/\S+$/.test(value));

const saveSchema = z.object({
  projectId: z.uuid(),
  // Empty: a new platform added by hand, its key made here.
  platform: z.union([platformKey, z.literal("")]),
  label: z.string().trim().max(80),
  url: httpsOrEmpty,
  available: z.boolean(),
});

/** The official link and the declared availability of one platform. */
export async function saveDistributionPlatform(
  input: z.input<typeof saveSchema>,
): Promise<DistributionResult> {
  await requireApproved();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const v = parsed.data;
  const platform =
    v.platform || `other_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
  if (platform.startsWith("other_") && !v.label)
    return { ok: false, error: e.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_distribution_platform", {
    p_project_id: v.projectId,
    p_platform: platform,
    p_label: platform.startsWith("other_") ? v.label : "",
    p_url: v.url,
    p_available: v.available,
  });
  return error ? failure(error) : done(v.projectId);
}

const verifySchema = z.object({
  projectId: z.uuid(),
  platform: platformKey,
  verification: z.enum(VERIFICATIONS),
  verificationNote: z.string().trim().max(1000),
  compliance: z.enum(COMPLIANCES),
  complianceNote: z.string().trim().max(1000),
});

/** What a person saw when opening the link (CA10). */
export async function verifyDistributionPlatform(
  input: z.input<typeof verifySchema>,
): Promise<DistributionResult> {
  await requireApproved();
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const v = parsed.data;
  if (
    (v.verification === "unavailable" && !v.verificationNote) ||
    (v.compliance === "non_compliant" && !v.complianceNote)
  )
    return { ok: false, error: fr.distribution.platforms.form.noteRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_distribution_platform", {
    p_project_id: v.projectId,
    p_platform: v.platform,
    p_verification: v.verification,
    p_verification_note: v.verificationNote,
    p_compliance: v.compliance,
    p_compliance_note: v.complianceNote,
  });
  return error ? failure(error) : done(v.projectId);
}
