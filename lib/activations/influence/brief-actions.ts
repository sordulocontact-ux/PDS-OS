"use server";

import { z } from "zod";

import {
  activationDone,
  activationFailure,
  invalid,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.activationBrief.brief;

const schema = z.object({
  projectId: z.uuid(),
  targetId: z.uuid(),
  fee: z.string().max(20),
  deliverables: z.string().max(2000),
  organic: z.string().max(1000),
  ads: z.string().max(1000),
  body: z.string().max(20000),
  channel: z.enum(["email", "dm", "whatsapp"]),
});

const euros = (value: string) => {
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * « Marquer le brief comme envoyé » (proto `cbrief`): PDS's proposal and the
 * brief, in one gesture, declared sent by the person who sent it — PDS OS
 * sends nothing. The database checks the concept is validated and that it
 * is the collaboration's first position (send_influence_brief).
 */
export async function sendInfluenceBrief(
  input: z.input<typeof schema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const fee = euros(v.fee);
  if (fee === null) return invalid(t.errors.fee);
  if (!v.body.trim()) return invalid(t.errors.message);
  return withOutcome(v.projectId, ["marketing"], t.done, async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("send_influence_brief", {
      p_target_id: v.targetId,
      p_fee: fee,
      p_deliverables: v.deliverables,
      p_organic: v.organic,
      p_ads: v.ads,
      p_body: v.body,
      p_channel: v.channel,
    });
    return error ? activationFailure(error) : activationDone(v.projectId);
  });
}
