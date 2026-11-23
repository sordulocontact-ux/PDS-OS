"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { dealFailure } from "@/lib/deals/errors";
import { findGmailMemos, type GmailMemo } from "@/lib/deals/gmail-memos";
import { loadDeal } from "@/lib/deals/queries";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { deals } from "@/lib/i18n/fr/deals";
import {
  getGmailAttachment,
  getGmailMessage,
} from "@/lib/integrations/google-gmail";
import { gmailAttachments } from "@/lib/mailbox/gmail";
import { gmailAccountOf } from "@/lib/mailbox/gmail-accounts";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const GMAIL_ID = /^[A-Za-z0-9]{6,64}$/;
// The bucket deal-files' limit.
const MAX_BYTES = 20 * 1024 * 1024;
const t = dealMemos.gmail;

/** The memos waiting in the member's own Gmail for this deal, read after
 * the page shows (never stored). */
export async function dealGmailMemos(dealId: string): Promise<GmailMemo[]> {
  const access = await requireApproved();
  if (!z.uuid().safeParse(dealId).success) return [];
  const deal = await loadDeal(access, dealId);
  return deal ? findGmailMemos(access, deal) : [];
}

/**
 * « Ranger dans le deal »: the mail is read again from the member's own
 * account (Gmail gives new attachment ids at each reading), its PDFs are
 * uploaded with the member's session into the deal's folder, then
 * file_deal_memo_from_mail makes them the deal's memo, « À valider ».
 */
export async function fileGmailMemo(
  dealId: string,
  accountKey: string,
  messageId: string,
): Promise<WriteResult> {
  const access = await requireApproved();
  if (!z.uuid().safeParse(dealId).success || !GMAIL_ID.test(messageId))
    return { ok: false, error: deals.errors.invalid };
  const [deal, account] = await Promise.all([
    loadDeal(access, dealId),
    gmailAccountOf(access, accountKey),
  ]);
  if (!deal?.canWrite || !access.organizationId || !account)
    return { ok: false, error: deals.errors.notFound };

  const supabase = await createClient();
  const bucket = supabase.storage.from("deal-files");
  const uploaded: { path: string; name: string }[] = [];
  let mail: { key: string; from: string; subject: string; at: string };
  try {
    const token = await account.token();
    const message = await getGmailMessage(token, messageId, "head");
    const headers = message.payload?.headers ?? [];
    const header = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name)?.value ?? "";
    mail = {
      key: header("message-id"),
      from: header("from"),
      subject: header("subject"),
      at: new Date(Number(message.internalDate ?? 0)).toISOString(),
    };
    const files = gmailAttachments(message.payload)
      .filter(
        (f) =>
          f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      )
      .slice(0, 10);
    if (!mail.key || files.length === 0) return { ok: false, error: t.gone };
    for (const file of files) {
      if (file.size > MAX_BYTES) continue;
      const content = await getGmailAttachment(
        token,
        messageId,
        file.attachmentId,
      );
      const path = `${access.organizationId}/${deal.id}/${crypto.randomUUID()}.pdf`;
      const { error } = await bucket.upload(path, content, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (error) throw new Error(error.message);
      uploaded.push({ path, name: file.name });
    }
  } catch (error) {
    console.error("fileGmailMemo:", error);
    if (uploaded.length) await bucket.remove(uploaded.map((f) => f.path));
    return { ok: false, error: t.failed };
  }
  if (uploaded.length === 0) return { ok: false, error: t.tooLarge };

  const { error } = await supabase.rpc("file_deal_memo_from_mail", {
    p_deal_id: deal.id,
    p_message_id: mail.key,
    p_from: mail.from,
    p_subject: mail.subject,
    p_received_at: mail.at,
    p_files: uploaded,
  });
  if (error) {
    await bucket.remove(uploaded.map((f) => f.path));
    return {
      ok: false,
      error:
        (dealMemos.errors as Record<string, string>)[error.message] ??
        dealFailure("fileGmailMemo", error),
    };
  }
  revalidatePath(routes.deal(deal.id));
  return { ok: true };
}
