import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/** Constant-time comparison of a cron's bearer token (hash first: equal
 * lengths), shared by every route under /api/cron. */
export function isCronAuthorized(
  header: string | null,
  secret: string,
): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header ?? ""), digest(`Bearer ${secret}`));
}

/** A cron's JSON answer, never cached. */
export function cronJson(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
