import { cronJson as json, isCronAuthorized } from "@/lib/cron/auth";
import { getServerEnv } from "@/lib/env";
import { releaseIsrcs } from "@/lib/release/isrc";
import { detectAndRecord } from "@/lib/release/persist";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily release detection (Vercel cron, see vercel.json), the
 * Distribution's reserves past their deadline and the deals' follow-ups due. Not triggered by a
 * user: the only place where the service role is used. Releases are checked
 * one after the other, MusicBrainz allows one request per second.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const PAUSE_MS = 1100;
// Stop before maxDuration: the remaining releases wait for tomorrow.
const TIME_BUDGET_MS = 270_000;

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

  const supabase = createAdminClient();
  if (!supabase) return json({ error: "misconfigured" }, 503);

  // The Distribution's reserves past their deadline (recette DIST-007): the
  // database flags them and tells their owner and the decider (trigger).
  const overdue = await supabase.rpc("flag_overdue_distribution_reserves");
  if (overdue.error)
    console.error("cron reserves overdue:", overdue.error.message);
  // The deals' follow-ups whose date has come (BIZ 4): told once to their
  // assignee (the database writes the notification).
  const followUps = await supabase.rpc("flag_due_deal_follow_ups");
  if (followUps.error)
    console.error("cron deal follow-ups:", followUps.error.message);

  const { data: releases, error } = await supabase
    .from("releases")
    .select("id, project_id, isrc, spotify_url")
    .order("last_checked_at", { ascending: true, nullsFirst: true });
  if (error) {
    console.error("cron detect-releases:", error.code, error.message);
    return json({ error: "query_failed" }, 500);
  }

  // The Catalogue's ISRC (lib/release/isrc.ts): releases without one wait.
  const isrcs = await releaseIsrcs(supabase, releases);
  const startedAt = Date.now();
  const summary = {
    total: releases.length,
    checked: 0,
    online: 0,
    failed: 0,
    skipped: 0,
  };

  for (const [index, release] of releases.entries()) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      summary.skipped = releases.length - index;
      break;
    }
    if (index > 0)
      await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
    const isrc = isrcs.get(release.id);
    if (!isrc) continue;

    const outcome = await detectAndRecord(supabase, {
      id: release.id,
      isrc,
      spotifyUrl: release.spotify_url,
    }).catch(() => ({ ok: false as const }));

    if (outcome.ok) {
      summary.checked += 1;
      if (outcome.detected) summary.online += 1;
    } else {
      summary.failed += 1;
    }
  }

  return json({ ...summary, durationMs: Date.now() - startedAt });
}
