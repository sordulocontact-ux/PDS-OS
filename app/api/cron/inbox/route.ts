import { cronJson as json, isCronAuthorized } from "@/lib/cron/auth";
import { fileEmailedDealMemos } from "@/lib/email/deal-memo-inbox";
import { getServerEnv } from "@/lib/env";
import { fileEmailedProofs } from "@/lib/finance/proof-email";
import { fileClearanceReplies } from "@/lib/legal/clearance/inbox-replies";
import { syncMailbox } from "@/lib/mailbox/sync";
import { sendPendingPushes } from "@/lib/notifications/push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Every 10 minutes (pg_cron → public.poll_inbox, secrets in Vault): the
 * replies to the authorisation requests read in PO's mailbox and filed in
 * their journal (lib/legal/clearance/inbox-replies.ts), their responsible
 * told; then the tickets and invoices sent to po+justificatifs@, filed in
 * Finance › Justificatifs (lib/finance/proof-email.ts); then the deal memos
 * sent by a label or a brand, filed in their deal, the negotiator told
 * (lib/email/deal-memo-inbox.ts); then the Inbox and the Sent folder copied
 * for the page « Mails », 30 new messages per folder at most
 * (lib/mailbox/sync.ts). Not triggered by a user: service role (cron only).
 */

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let env;
  try {
    env = getServerEnv();
  } catch {
    return json({ error: "misconfigured" }, 503);
  }
  if (!env.CRON_SECRET || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "misconfigured" }, 503);
  }
  if (
    !isCronAuthorized(request.headers.get("authorization"), env.CRON_SECRET)
  ) {
    return json({ error: "unauthorized" }, 401);
  }
  const result = await fileClearanceReplies();
  // The box of proofs never stops the replies: its failure is only logged.
  const proofs = await fileEmailedProofs().catch((error: unknown) => {
    console.error(
      "cron inbox proofs:",
      error instanceof Error ? error.message.slice(0, 200) : "unknown",
    );
    return null;
  });
  // Nor do the deal memos: their failure is only logged.
  const memos = await fileEmailedDealMemos().catch((error: unknown) => {
    console.error(
      "cron inbox deal memos:",
      error instanceof Error ? error.message.slice(0, 200) : "unknown",
    );
    return null;
  });
  // Nor does the copy of the mailbox: its failure is only logged.
  const mailbox = await syncMailbox().catch((error: unknown) => {
    console.error(
      "cron inbox mailbox:",
      error instanceof Error ? error.message.slice(0, 200) : "unknown",
    );
    return null;
  });
  if (!result) return json({ error: "inbox_unavailable" }, 503);
  if (result.filed > 0 || (memos?.filed ?? 0) > 0) {
    const supabase = createAdminClient();
    if (supabase) await sendPendingPushes(supabase);
  }
  return json({
    ...result,
    proofs: proofs?.filed ?? null,
    dealMemos: memos?.filed ?? null,
    mailbox: mailbox?.copied ?? null,
  });
}
