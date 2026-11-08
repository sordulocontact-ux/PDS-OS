import { cronJson as json, isCronAuthorized } from "@/lib/cron/auth";
import { getServerEnv } from "@/lib/env";
import { fileClearanceReplies } from "@/lib/legal/clearance/inbox-replies";
import { sendPendingPushes } from "@/lib/notifications/push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Every 10 minutes (pg_cron → public.poll_inbox, secrets in Vault): the
 * replies to the authorisation requests read in PO's mailbox and filed in
 * their journal (lib/legal/clearance/inbox-replies.ts), their responsible
 * told. Not triggered by a user: service role (cron only).
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
  if (!result) return json({ error: "inbox_unavailable" }, 503);
  if (result.filed > 0) {
    const supabase = createAdminClient();
    if (supabase) await sendPendingPushes(supabase);
  }
  return json(result);
}
