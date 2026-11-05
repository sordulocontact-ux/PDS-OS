"use server";

import { z } from "zod";

import {
  activationDone,
  activationFailure,
  invalid,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { emailMessage } from "@/lib/email/link-email";
import { projectTitleOf } from "@/lib/email/outcome";
import { emailEnabled } from "@/lib/email/send";
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
  // « Marquer comme envoyé » alone, after PDS OS could not e-mail it: the
  // person sent the message themselves.
  manual: z.boolean().optional(),
});

// The refusal when the e-mail did not leave: the form then offers to declare
// the sending by hand.
export type BriefResult =
  WriteResult | { ok: false; error: string; emailFailed: true };

const euros = (value: string) => {
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * « Marquer le brief comme envoyé » (proto `cbrief`): PDS's proposal and the
 * brief, in one gesture. By e-mail, PDS OS sends the message itself when it
 * can (SMTP, an address in the Réseau; Sacha, 05/11/2026) and declares it
 * sent only if it left; else the person sends it and declares it. The database checks the concept is validated and that it
 * is the collaboration's first position (send_influence_brief).
 */
export async function sendInfluenceBrief(
  input: z.input<typeof schema>,
): Promise<BriefResult> {
  await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const fee = euros(v.fee);
  if (fee === null) return invalid(t.errors.fee);
  if (!v.body.trim()) return invalid(t.errors.message);
  const emailed =
    v.channel === "email" && !v.manual
      ? await emailBrief(v.projectId, v.targetId, v.body)
      : "disabled";
  if (emailed === "failed")
    return { ok: false, error: t.errors.emailFailed, emailFailed: true };
  return withOutcome(
    v.projectId,
    ["marketing"],
    emailed === "sent" ? t.sentByEmail : t.done,
    async () => {
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
    },
  );
}

/** The brief's message, e-mailed to the creator of the collaboration. */
async function emailBrief(
  projectId: string,
  targetId: string,
  body: string,
): Promise<"sent" | "failed" | "disabled"> {
  if (!emailEnabled()) return "disabled";
  const supabase = await createClient();
  const { data: target } = await supabase
    .from("activation_targets")
    .select("contact_id")
    .eq("id", targetId)
    .maybeSingle();
  if (!target) return "disabled";
  const { data: contact } = await supabase
    .from("network_contacts")
    .select("name, email")
    .eq("id", target.contact_id)
    .maybeSingle();
  if (!contact?.email) return "disabled";
  return emailMessage({
    to: { name: contact.name, email: contact.email },
    subject: t.emailSubject(await projectTitleOf(projectId)),
    text: body,
  });
}
