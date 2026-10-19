"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The direction's gestures on « Prêt pour la sortie » (ticket Juridique 08):
// what blocks is computed again here, on the server, from every source —
// never taken from the browser.

const t = fr.legalReadiness;

async function readinessOf(projectId: string) {
  const id = catalogIdSchema.safeParse(projectId);
  const access = await requireApproved();
  if (!id.success || !can(access, "validate") || !can(access, "manage_legal"))
    return null;
  const ctx = await legalJourneyContext(id.data);
  return ctx.readiness ? { ...ctx, readiness: ctx.readiness } : null;
}

function done(projectId: string, message: string): WriteResult {
  revalidatePath(routes.projectLegal(projectId), "layout");
  revalidatePath(routes.projectRelease(projectId));
  return { ok: true, done: message };
}

const waiverSchema = z.object({
  projectId: catalogIdSchema,
  controlKey: z.string().min(1).max(120),
  reason: z.string().trim().min(1).max(1000),
});

/** « Accorder une dérogation » on an open control, with why. */
export async function grantReleaseWaiver(
  input: z.infer<typeof waiverSchema>,
): Promise<WriteResult> {
  const parsed = waiverSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.waiver.whyMissing };
  const ctx = await readinessOf(parsed.data.projectId);
  if (!ctx) return { ok: false, error: fr.auth.errors.forbidden };
  const control = ctx.readiness.controls.find(
    (c) => c.key === parsed.data.controlKey && c.status === "open" && !c.final,
  );
  if (!control) return { ok: false, error: t.errors.failed };
  const supabase = await createClient();
  const { error } = await supabase.rpc("grant_release_waiver", {
    p_project_id: parsed.data.projectId,
    p_control_key: control.key,
    p_control_label: control.label,
    p_reason: parsed.data.reason,
  });
  if (error) {
    console.error("grantReleaseWaiver:", error.message);
    return {
      ok: false,
      error: error.message.includes("release_already_validated")
        ? t.errors.already
        : t.errors.failed,
    };
  }
  return done(parsed.data.projectId, t.waiver.done);
}

/** The label's policy: does a SACEM declaration not filed block? */
export async function setReleasePolicy(
  projectId: string,
  sacemBlocks: boolean,
): Promise<WriteResult> {
  const ctx = await readinessOf(projectId);
  if (!ctx || !ctx.access.organizationId)
    return { ok: false, error: fr.auth.errors.forbidden };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_release_policy", {
    p_organization_id: ctx.access.organizationId,
    p_sacem_blocks: sacemBlocks,
  });
  if (error) {
    console.error("setReleasePolicy:", error.message);
    return { ok: false, error: t.errors.failed };
  }
  return done(projectId, t.policy.saved);
}

/** « Valider la sortie avant The Orchard »: refused while a blocking
 * control is open; the controls are kept as they stood. */
export async function validateRelease(projectId: string): Promise<WriteResult> {
  const ctx = await readinessOf(projectId);
  if (!ctx) return { ok: false, error: fr.auth.errors.forbidden };
  if (ctx.readiness.verdict === "no")
    return { ok: false, error: t.validate.blocked };
  const supabase = await createClient();
  const { error } = await supabase.rpc("validate_release", {
    p_project_id: projectId,
    p_snapshot: ctx.readiness.controls
      .filter((c) => !c.final)
      .map((c) => ({
        key: c.key,
        label: c.label,
        domain: c.domain,
        blocking: c.blocking,
        status: c.status,
        reason: c.reason,
        waiver: c.waiver?.reason ?? null,
      })),
  });
  if (error) {
    console.error("validateRelease:", error.message);
    return {
      ok: false,
      error: error.message.includes("release_already_validated")
        ? t.errors.already
        : t.errors.failed,
    };
  }
  return done(projectId, t.validate.done);
}
