import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { listTemplateSeries } from "@/lib/legal/contracts/templates";

/** One series of contract templates, for manage_legal only (like the
 * library), once per request: its frame answers a real 404 without it and
 * its page reuses the read. */
export const findTemplateSeries = trackedCache(async (seriesId: string) => {
  const access = await requireApproved();
  if (!can(access, "manage_legal") || !access.organizationId) return null;
  return (
    (await listTemplateSeries(access)).find((s) => s.seriesId === seriesId) ??
    null
  );
});
