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

const t = fr.productionProposal;
const e = t.errors;

function failure(error: { message?: string; code?: string }): PrepResult {
  const key = (Object.keys(e) as (keyof typeof e)[]).find((k) =>
    error.message?.includes(k),
  );
  return key ? { ok: false, error: e[key] } : prepFailure(error);
}

const https = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v));

const depositSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  number: z.number().int().min(1),
  treatment: https,
  moodboard: https,
  cutting: https,
  note: z.string().trim().max(2000),
});

/** « Déposer la Vn » in the app (the director when a member, or whoever
 * organises the production for the director). */
export async function depositProposal(
  input: z.input<typeof depositSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = depositSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid_url };
  const p = parsed.data;
  if (!p.treatment || !p.cutting)
    return { ok: false, error: e.pieces_required };
  const supabase = await createClient();
  return withOutcome(
    p.projectId,
    ["marketing"],
    t.deposit.done(p.number),
    async () => {
      const { error } = await supabase.rpc(
        "deposit_production_direction_version",
        {
          p_sheet_id: p.sheetId,
          p_treatment: p.treatment,
          p_moodboard: p.moodboard || null,
          p_cutting: p.cutting,
          p_note: p.note || null,
        },
      );
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
  comment: z.string().trim().max(2000),
});

/** « Valider la Vn » / « Demander des modifications » (the internal
 * creative validation). */
export async function decideProposal(
  input: z.input<typeof decideSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const p = parsed.data;
  if (!p.approve && !p.comment) return { ok: false, error: e.reason_required };
  const supabase = await createClient();
  return withOutcome(
    p.projectId,
    ["marketing"],
    p.approve ? t.decide.approved(p.number) : t.decide.asked,
    async () => {
      const { error } = await supabase.rpc(
        "decide_production_direction_version",
        {
          p_version_id: p.versionId,
          p_approve: p.approve,
          p_comment: p.comment,
        },
      );
      if (error) return failure(error);
      await schedulePendingPushes();
      return prepDone(p.projectId);
    },
  );
}

const requestSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  reason: z.string().trim().min(1).max(1000),
});

/** « Demander une nouvelle version »: the retained version stays retained
 * until the next one is. */
export async function requestProposalVersion(
  input: z.input<typeof requestSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.request.reasonRequired };
  const p = parsed.data;
  const supabase = await createClient();
  return withOutcome(p.projectId, ["marketing"], t.request.done, async () => {
    const { error } = await supabase.rpc(
      "request_production_direction_version",
      { p_sheet_id: p.sheetId, p_reason: p.reason },
    );
    return error ? failure(error) : prepDone(p.projectId);
  });
}

const extSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  contactId: z.uuid().nullable(),
});

/** « Validation créative externe » of « Qui fait quoi » (the owner): a
 * contact of the Réseau, or nobody. */
export async function setCreativeExt(
  input: z.input<typeof extSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = extSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_production_creative_ext", {
    p_sheet_id: p.sheetId,
    p_contact_id: p.contactId,
  });
  return error ? failure(error) : prepDone(p.projectId);
}
