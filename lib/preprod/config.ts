import "server-only";

import { getServerEnv } from "@/lib/env";

/**
 * Pre-production tools (bar « Voir comme / Aller à », PO's test data) are on
 * only where PREPROD_TOOLS=1 and PREPROD_PASSWORD are set, which is the
 * Vercel environment of the `pre-prod` branch alone. Never on the production
 * deployment, whatever its variables say.
 */
export function preprodPassword(): string | null {
  if (process.env.VERCEL_ENV === "production") return null;
  const env = getServerEnv();
  if (env.PREPROD_TOOLS !== "1" || !env.PREPROD_PASSWORD) return null;
  return env.PREPROD_PASSWORD;
}

export function isPreprod(): boolean {
  return preprodPassword() !== null;
}
