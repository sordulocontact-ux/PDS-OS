import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { listTemplateSeries } from "@/lib/legal/contracts/templates";

/** One series of contract templates, for whoever writes them (manage_legal)
 * or validates them (validate_contracts: the business manager and the
 * direction, Ibé 18/11/2026), once per request: its frame answers a real 404
 * without it and its page reuses the read. Found by its series or by the id
 * of one of its versions (what a notification names). */
export const findTemplateSeries = trackedCache(async (seriesId: string) => {
  const access = await requireApproved();
  if (
    !(can(access, "manage_legal") || can(access, "validate_contracts")) ||
    !access.organizationId
  )
    return null;
  return (
    (await listTemplateSeries(access)).find(
      (s) =>
        s.seriesId === seriesId || s.versions.some((v) => v.id === seriesId),
    ) ?? null
  );
});
