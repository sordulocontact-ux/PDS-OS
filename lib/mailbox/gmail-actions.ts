"use server";

import { requireApproved } from "@/lib/auth/dal";
import { getGmailMessage } from "@/lib/integrations/google-gmail";
import { mailboxGmail } from "@/lib/i18n/fr/mailbox-gmail";
import { gmailText, listGmail } from "@/lib/mailbox/gmail";
import { gmailAccountOf, gmailAccounts } from "@/lib/mailbox/gmail-accounts";
import type { MailBodyResult } from "@/lib/mailbox/read-actions";
import type { MailboxMessage } from "@/lib/mailbox/types";

// Gmail's ids: letters and digits only.
const GMAIL_ID = /^[A-Za-z0-9]{6,64}$/;

/**
 * The whole text of a mail of « Mon Gmail », read from Gmail when its panel
 * opens: only from one of the signed-in member's own accounts.
 */
export async function readGmailBody(
  accountKey: string,
  messageId: string,
): Promise<MailBodyResult> {
  const t = mailboxGmail.errors;
  if (!GMAIL_ID.test(messageId)) return { ok: false, error: t.notFound };
  const access = await requireApproved();
  const account = await gmailAccountOf(access, accountKey);
  if (!account) return { ok: false, error: t.notFound };
  try {
    const message = await getGmailMessage(
      await account.token(),
      messageId,
      "full",
    );
    return { ok: true, text: gmailText(message) };
  } catch {
    return { ok: false, error: t.unreachable(account.email) };
  }
}

/**
 * « Mon Gmail » for the page « Mails », asked by the page once it shows
 * (never before: Gmail answers in a second or more, PDS OS's box at once):
 * the member's own accounts only, kept a minute (listGmail).
 */
export async function loadMyGmail(): Promise<{
  messages: MailboxMessage[];
  failed: string[];
}> {
  const access = await requireApproved();
  const { accounts } = await gmailAccounts(access);
  return accounts.length > 0
    ? listGmail(accounts)
    : { messages: [], failed: [] };
}
