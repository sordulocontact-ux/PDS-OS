"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

export type ProductionResult = { ok: true } | { ok: false; error: string };

const e = fr.production.errors;

function failure(error: { code?: string; message?: string }): ProductionResult {
  const message = error.message ?? "";
  if (error.code === "42501") return { ok: false, error: e.forbidden };
  if (message.includes("stage_locked")) return { ok: false, error: e.locked };
  // With a production sheet (20261010006201_production_post.sql).
  if (message.includes("approve_on_version"))
    return { ok: false, error: fr.productionDelivery.errors.approveOnVersion };
  if (message.includes("exports_not_checked"))
    return { ok: false, error: fr.productionDelivery.errors.exportsNotChecked };
  if (message.includes("invalid_transition"))
    return { ok: false, error: e.order };
  if (error.code === "23514") return { ok: false, error: e.url };
  console.error("production:", error.code, message);
  return { ok: false, error: e.generic };
}

function done(projectId: string): ProductionResult {
  // The Marketing's status and the overview follow.
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}

const finalSchema = z.object({
  projectId: z.uuid(),
  deliverableId: z.uuid(),
  url: z.string().trim().max(2048),
  note: z.string().trim().max(1000),
});

/** « Fichier final »: a new one clears the decisions on the previous one. */
export async function setDeliverableFinal(
  input: z.input<typeof finalSchema>,
): Promise<ProductionResult> {
  await requireApproved();
  const parsed = finalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.url };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_deliverable_final", {
    p_deliverable_id: parsed.data.deliverableId,
    p_url: parsed.data.url,
    p_note: parsed.data.note,
  });
  return error ? failure(error) : done(parsed.data.projectId);
}

const stepSchema = z.object({
  projectId: z.uuid(),
  deliverableId: z.uuid(),
  step: z.enum(["approve", "check", "deliver", "reopen"]),
});

/** Validation créative, contrôle technique, livraison — or « Rouvrir ». */
export async function advanceDeliverable(
  input: z.input<typeof stepSchema>,
): Promise<ProductionResult> {
  await requireApproved();
  const parsed = stepSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.generic };
  const supabase = await createClient();
  const { error } = await supabase.rpc("advance_deliverable_delivery", {
    p_deliverable_id: parsed.data.deliverableId,
    p_step: parsed.data.step,
  });
  return error ? failure(error) : done(parsed.data.projectId);
}
