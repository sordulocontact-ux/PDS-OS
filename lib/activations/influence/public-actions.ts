"use server";

import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import { LINK_KEY, linkKeyArgs } from "@/lib/portal/link-key";

// The creator's answer, without an account : the token, the hash of the
// version shown, the declared name and the consent are checked by
// respond_influence_agreement.

const schema = z.object({
  token: z.string().regex(LINK_KEY),
  decision: z.enum(["accept", "change"]),
  name: z.string().trim().max(200),
  comment: z.string().trim().max(2000),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
  consent: z.boolean(),
});

export type AgreementAnswer =
  | { ok: true; state: "accepted" | "change_requested" }
  | { ok: false; error: string };

export async function answerAgreement(
  input: z.input<typeof schema>,
): Promise<AgreementAnswer> {
  const t = fr.activationInfluence.public;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.failed };
  const v = parsed.data;
  if (v.decision === "accept" && (!v.name || !v.consent))
    return { ok: false, error: t.nameRequired };
  if (v.decision === "change" && !v.comment)
    return { ok: false, error: t.commentRequired };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("respond_influence_agreement", {
    ...linkKeyArgs(v.token),
    p_decision: v.decision,
    p_name: v.name || null,
    p_comment: v.comment || null,
    p_hash: v.hash,
    p_consent: v.consent,
  });
  if (error) {
    const message = error.message ?? "";
    if (message.includes("agreement_content_changed"))
      return { ok: false, error: t.changed };
    if (message.includes("agreement_link_closed"))
      return { ok: false, error: t.states.revoked };
    if (message.includes("agreement_identity_required"))
      return { ok: false, error: t.nameRequired };
    if (message.includes("agreement_comment_required"))
      return { ok: false, error: t.commentRequired };
    console.error("answerAgreement:", message);
    return { ok: false, error: t.failed };
  }
  return {
    ok: true,
    state: data === "accepted" ? "accepted" : "change_requested",
  };
}
