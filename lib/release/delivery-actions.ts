"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { rankedNetwork, type RankedPerson } from "@/lib/network/ranked-people";
import { deliveryReadiness } from "@/lib/release/delivery";
import { getProjectRelease } from "@/lib/release/queries";
import { createClient } from "@/lib/supabase/server";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

export type DeliveryResult = { ok: true } | { ok: false; error: string };

const e = fr.releaseDelivery.errors;
const isoDate = z.iso.date();

/** A database refusal, in words (supabase/migrations/20261010000201). */
function failure(error: { code?: string; message?: string }): DeliveryResult {
  const message = error.message ?? "";
  if (error.code === "42501") return { ok: false, error: e.forbidden };
  if (message.includes("release_already_delivered"))
    return { ok: false, error: e.alreadyDelivered };
  if (message.includes("release_distributor_invalid"))
    return { ok: false, error: e.distributor };
  if (message.includes("release_online")) return { ok: false, error: e.online };
  if (message.includes("release_not_delivered"))
    return { ok: false, error: e.notDelivered };
  if (error.code === "23514") return { ok: false, error: e.future };
  console.error("releaseDelivery:", error.code, message);
  return { ok: false, error: e.generic };
}

function done(projectId: string): DeliveryResult {
  // The sidebar's status and the overview follow the delivery.
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}

/** The Réseau to pick the distributor from: distributors first. */
export async function listDistributorOptions(): Promise<RankedPerson[]> {
  await requireApproved();
  return rankedNetwork(await createClient(), "distributor");
}

const deliverSchema = z.object({
  projectId: z.uuid(),
  contactId: z.uuid(),
  deliveredOn: isoDate,
  note: z.string().trim().max(1000),
});

/** « Valider la livraison »: refused while something blocks it, with the
 * same rule as the screen (lib/release/delivery.ts). */
export async function recordDelivery(
  input: z.input<typeof deliverSchema>,
): Promise<DeliveryResult> {
  await requireApproved();
  const parsed = deliverSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.generic };
  const { projectId, contactId, deliveredOn, note } = parsed.data;
  const supabase = await createClient();
  const [data, states] = await Promise.all([
    getProjectRelease(supabase, projectId),
    loadWorkflowStates(projectId),
  ]);
  const release = data?.release;
  if (!release) return { ok: false, error: e.generic };
  const readiness = deliveryReadiness({
    projectId,
    release: {
      isrc: release.isrc,
      upc: release.upc,
      plannedDate: release.planned_release_date,
    },
    dependencies: states?.dependencies ?? [],
    legalItems: states?.details.legalItems ?? [],
  });
  if (!readiness.ready) return { ok: false, error: e.notReady };
  const { error } = await supabase.rpc("record_release_delivery", {
    p_release_id: release.id,
    p_contact_id: contactId,
    p_delivered_on: deliveredOn,
    p_note: note,
  });
  return error ? failure(error) : done(projectId);
}

/** « Rouvrir la livraison ». */
export async function reopenDelivery(
  projectId: string,
  releaseId: string,
): Promise<DeliveryResult> {
  await requireApproved();
  const ids = z.object({ projectId: z.uuid(), releaseId: z.uuid() });
  if (!ids.safeParse({ projectId, releaseId }).success)
    return { ok: false, error: e.generic };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_release_delivery", {
    p_release_id: releaseId,
  });
  return error ? failure(error) : done(projectId);
}

const onlineSchema = z.object({
  projectId: z.uuid(),
  releaseId: z.uuid(),
  onlineOn: isoDate,
  url: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => value === "" || /^https:\/\/\S+$/.test(value)),
});

/** « Confirmer la mise en ligne », when the detection cannot see it. */
export async function confirmOnline(
  input: z.input<typeof onlineSchema>,
): Promise<DeliveryResult> {
  await requireApproved();
  const parsed = onlineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.url };
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_release_online", {
    p_release_id: parsed.data.releaseId,
    p_online_on: parsed.data.onlineOn,
    p_url: parsed.data.url,
  });
  if (error?.code === "23514") return { ok: false, error: e.beforeDelivery };
  return error ? failure(error) : done(parsed.data.projectId);
}
