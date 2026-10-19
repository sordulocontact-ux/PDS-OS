"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { schedulePendingPushes } from "@/lib/notifications/push";
import {
  prepDone,
  prepFailure,
  type PrepResult,
} from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

const t = fr.productionLight;
const e = t.errors;

function failure(error: { message?: string; code?: string }): PrepResult {
  const key = (Object.keys(e) as (keyof typeof e)[]).find((k) =>
    error.message?.includes(k),
  );
  return key ? { ok: false, error: e[key] } : prepFailure(error);
}

const size = z.number().int().min(1).max(30000).nullable();

const depositSchema = z
  .object({
    projectId: z.uuid(),
    sheetId: z.uuid(),
    number: z.number().int().min(1),
    fileId: z.uuid().nullable(),
    url: z
      .string()
      .trim()
      .max(2000)
      .refine((v) => v === "" || /^https:\/\/\S+$/.test(v)),
    width: size,
    height: size,
  })
  .refine((v) => (v.fileId === null) !== (v.url === ""));

/** « Déposer la Vn » of a light journey in the app: the image already
 * uploaded (its size read by the browser) or a link, submitted at once. */
export async function depositLightVersion(
  input: z.input<typeof depositSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = depositSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.one_media };
  const p = parsed.data;
  const supabase = await createClient();
  return withOutcome(
    p.projectId,
    ["marketing"],
    t.deposit.done(p.number),
    async () => {
      const { error } = await supabase.rpc("deposit_production_light_version", {
        p_sheet_id: p.sheetId,
        p_file_id: p.fileId,
        p_url: p.url || null,
        p_width: p.width,
        p_height: p.height,
      });
      if (error) return failure(error);
      await schedulePendingPushes();
      return prepDone(p.projectId);
    },
  );
}

const decideSchema = z.object({
  projectId: z.uuid(),
  versionId: z.uuid(),
  number: z.number().int().min(1),
  approve: z.boolean(),
  note: z.string().trim().max(2000),
});

/** « Valider la Vn » / « Demander des modifications » (the creative
 * validation). */
export async function decideLightVersion(
  input: z.input<typeof decideSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const p = parsed.data;
  if (!p.approve && !p.note) return { ok: false, error: e.reason_required };
  const supabase = await createClient();
  return withOutcome(
    p.projectId,
    ["marketing"],
    p.approve ? t.decide.approved(p.number) : t.decide.asked,
    async () => {
      const { error } = await supabase.rpc("decide_production_light_version", {
        p_version_id: p.versionId,
        p_approve: p.approve,
        p_note: p.note,
      });
      if (error) return failure(error);
      await schedulePendingPushes();
      return prepDone(p.projectId);
    },
  );
}

const checkSchema = z.object({ projectId: z.uuid(), sheetId: z.uuid() });

/** « Confirmer : fichiers conformes » (whoever organises the production;
 * the database refuses a non-conforming cover). */
export async function confirmLightCheck(
  input: z.input<typeof checkSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = checkSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const p = parsed.data;
  const supabase = await createClient();
  return withOutcome(
    p.projectId,
    ["marketing"],
    t.control.confirmed,
    async () => {
      const { error } = await supabase.rpc("confirm_production_light_check", {
        p_sheet_id: p.sheetId,
      });
      return error ? failure(error) : prepDone(p.projectId);
    },
  );
}

const recipient = z.object({
  personId: z.uuid().nullable(),
  contactId: z.uuid().nullable(),
  name: z.string().trim().max(200),
  purpose: z.enum(["distribution", "activations", "validation"]).nullable(),
});

const deliverSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  recipients: z.array(recipient).min(1).max(30),
  // A light journey hands over to Activations at once, to the member
  // checked for Activations (proto: « Livré … à : Distribution,
  // Activations »).
  handOff: z.boolean(),
  formats: z.array(z.string().trim().min(1).max(40)).max(20),
});

/** « Confirmer la livraison » to its recipients (the project's owner). */
export async function deliverProduction(
  input: z.input<typeof deliverSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = deliverSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.recipients_required };
  const p = parsed.data;
  const supabase = await createClient();
  return withOutcome(p.projectId, ["marketing"], t.delivery.done, async () => {
    const { error } = await supabase.rpc("deliver_production", {
      p_sheet_id: p.sheetId,
      p_recipients: p.recipients,
    });
    if (error) return failure(error);
    const activations = p.recipients.find(
      (r) => r.purpose === "activations" && r.personId,
    );
    if (p.handOff && activations?.personId) {
      const { error: handOff } = await supabase.rpc(
        "transmit_production_to_activations",
        {
          p_sheet_id: p.sheetId,
          p_formats: p.formats,
          p_constraints: "",
          p_recipient_person_id: activations.personId,
        },
      );
      if (handOff)
        console.error("deliverProduction hand-off:", handOff.message);
    }
    await schedulePendingPushes();
    return prepDone(p.projectId);
  });
}
