"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { parseTimecode } from "@/lib/master-workflow/mix-types";
import { createClient } from "@/lib/supabase/server";

const t = fr.masterListen;

/**
 * « Envoyer mon retour », from the artist's page, without an account: a
 * comment of the version with its timecode, read by the team only; the one
 * who decides is told (post_master_listen_comment).
 */
export async function sendListenFeedback(
  token: string,
  input: {
    versionId: string;
    timecode: string;
    body: string;
    clientKey: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const at = parseTimecode(input.timecode);
  if (Number.isNaN(at)) return { ok: false, error: t.timecodeInvalid };
  const v = z
    .object({
      token: z.string().regex(/^[0-9a-f]{64}$/),
      versionId: z.uuid(),
      body: z.string().trim().min(1).max(2000),
      clientKey: z.uuid(),
    })
    .safeParse({ token, ...input });
  if (!v.success) return { ok: false, error: t.bodyMissing };
  const supabase = await createClient();
  const { error } = await supabase.rpc("post_master_listen_comment", {
    p_contact_token: v.data.token,
    p_version_id: v.data.versionId,
    p_timecode_seconds: at,
    p_body: v.data.body,
    p_client_key: v.data.clientKey,
  });
  if (error) {
    console.error("sendListenFeedback:", error.message);
    return {
      ok: false,
      error: error.message.includes("not_listening") ? t.decided : t.failed,
    };
  }
  revalidatePath(`/c/${token}`);
  return { ok: true };
}
