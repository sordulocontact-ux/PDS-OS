import { createHash, timingSafeEqual } from "node:crypto";

import { getServerEnv } from "@/lib/env";
import { releaseIsrcs } from "@/lib/release/isrc";
import { detectAndRecord } from "@/lib/release/persist";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily release detection (Vercel cron, see vercel.json). Not triggered by a
 * user: the only place where the service role is used. Releases are checked
 * one after the other, MusicBrainz allows one request per second.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const PAUSE_MS = 1100;
// Stop before maxDuration: the remaining releases wait for tomorrow.
const TIME_BUDGET_MS = 270_000;

/** Constant-time comparison of the bearer token (hash first: equal lengths). */
function isAuthorized(header: string | null, secret: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header ?? ""), digest(`Bearer ${secret}`));
}

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

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
  if (!isAuthorized(request.headers.get("authorization"), env.CRON_SECRET)) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabase = createAdminClient();
  if (!supabase) return json({ error: "misconfigured" }, 503);

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
