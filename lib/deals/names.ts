// A deal's name in a list, a title, a notification (BIZ 4). Client-safe.

import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";

const t = deals.name;

/** « Nadia · Le titre », « Nadia · Titre 2 », « Nadia · PDS MIC #5 »,
 * else the project or the artist alone. */
export function dealName(
  deal: Pick<
    Deal,
    "artistName" | "titleLabel" | "titlePosition" | "projectTitle"
  >,
): string {
  const title =
    deal.titleLabel ??
    (deal.titlePosition !== null ? t.title(deal.titlePosition) : null);
  const what = title ?? deal.projectTitle;
  if (deal.artistName && what) return t.join(deal.artistName, what);
  return deal.artistName ?? what ?? t.fallback;
}
