"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import type { FormState } from "@/lib/auth/form-state";
import {
  designDone,
  designError,
  refreshConception,
  type DesignResult,
} from "@/lib/design/actions/shared";
import { ADDITION_ORIGINS } from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const optionalId = z
  .string()
  .trim()
  .transform((value) => value || null)
  .pipe(z.uuid().nullable());

const additionSchema = z
  .object({
    projectId: z.uuid(),
    title: z.string().trim().min(1).max(200),
    origin: z.enum(ADDITION_ORIGINS),
    leverId: optionalId,
    callId: optionalId,
    note: z
      .string()
      .trim()
      .max(1000)
      .transform((value) => value || null),
  })
  // The provenance names its lever or its call, nothing else.
  .transform((v) => ({
    ...v,
    leverId: v.origin === "strategy_decision" ? v.leverId : null,
    callId: v.origin === "call" ? v.callId : null,
  }));

/**
 * « Ajouter un livrable »: a need arrived late, with its provenance. It is
 * added « à qualifier »: neither validated nor planned (the database never
 * lets a person confirm it, design_deliverables). Owner only, while the
 * Conception is open.
 */
export async function addConceptionDeliverable(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const t = fr.conception.errors;
  const values = Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [key, String(value)]),
  );
  const parsed = additionSchema.safeParse({
    ...values,
    leverId: values.leverId ?? "",
    callId: values.callId ?? "",
    note: values.note ?? "",
  });
  if (!parsed.success) return { status: "error", formError: t.invalid, values };
  const p = parsed.data;
  if (p.origin === "strategy_decision" && !p.leverId)
    return {
      status: "error",
      fieldErrors: { leverId: t.leverRequired },
      values,
    };
  if (p.origin === "call" && !p.callId)
    return { status: "error", fieldErrors: { callId: t.callRequired }, values };

  const access = await requireApproved();
  if (!access.organizationId)
    return { status: "error", formError: t.generic, values };
  const supabase = await createClient();
  const { error } = await supabase.from("design_deliverables").insert({
    organization_id: access.organizationId,
    project_id: p.projectId,
    title: p.title,
    origin: p.origin,
    lever_id: p.leverId,
    call_id: p.callId,
    note: p.note,
  });
  if (error) {
    console.error("addConceptionDeliverable:", error.code, error.message);
    return { status: "error", formError: designError(error), values };
  }
  refreshConception(p.projectId);
  return { status: "success", message: fr.conception.add.added };
}

/** Takes back a need still to qualify (owner, Conception open). */
export async function removeConceptionDeliverable(
  projectId: string,
  deliverableId: string,
): Promise<DesignResult> {
  if (
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(deliverableId).success
  )
    return { ok: false, error: fr.conception.errors.generic };
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_deliverables")
    .delete()
    .eq("id", deliverableId)
    .eq("project_id", projectId)
    .select("id");
  // RLS hides what it refuses: nothing deleted means not allowed.
  if (!error && (data?.length ?? 0) === 0)
    return { ok: false, error: fr.conception.errors.forbidden };
  return designDone(projectId, error, "removeConceptionDeliverable");
}
