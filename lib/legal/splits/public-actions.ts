"use server";

import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// The answer of a contributor, without an account: the token and the hash of
// the content shown are checked by respond_split_confirmation.

const answerSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/),
  decision: z.enum(["confirm", "dispute"]),
  comment: z.string().trim().max(2000),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
});

export type AnswerResult =
  { ok: true; decision: "confirm" | "dispute" } | { ok: false; error: string };

export async function answerSplit(
  input: z.input<typeof answerSchema>,
): Promise<AnswerResult> {
  const t = fr.legalSplits.public;
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.failed };
  if (parsed.data.decision === "dispute" && !parsed.data.comment)
    return { ok: false, error: t.commentRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_split_confirmation", {
    p_token: parsed.data.token,
    p_decision: parsed.data.decision,
    p_comment: parsed.data.comment || null,
    p_hash: parsed.data.hash,
  });
  if (error) {
    const message = error.message ?? "";
    if (message.includes("split_content_changed"))
      return { ok: false, error: t.changed };
    if (message.includes("split_link_closed"))
      return { ok: false, error: t.states.revoked };
    console.error("answerSplit:", message);
    return { ok: false, error: t.failed };
  }
  return { ok: true, decision: parsed.data.decision };
}
