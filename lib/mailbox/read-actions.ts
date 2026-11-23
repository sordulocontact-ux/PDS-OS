"use server";

import { mailbox } from "@/lib/i18n/fr/mailbox";
import { createClient } from "@/lib/supabase/server";

export type MailBodyResult =
  { ok: true; text: string } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * The whole text of a mail, read when its panel opens: under the viewer's
 * session, so RLS decides (their own mails, the direction's all).
 */
export async function readMailboxBody(id: string): Promise<MailBodyResult> {
  const t = mailbox.errors;
  if (!UUID.test(id)) return { ok: false, error: t.notFound };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mailbox_messages")
    .select("body_text")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("readMailboxBody:", error.message);
    return { ok: false, error: mailbox.sheet.bodyError };
  }
  if (!data) return { ok: false, error: t.notFound };
  return { ok: true, text: data.body_text };
}
