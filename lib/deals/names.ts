// A deal's name in a list, a title, a notification (BIZ 4). Client-safe.

import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";

const t = deals.name;

/** « Nadia · Le titre », « Nadia · Titre 2 », « Nadia · PDS MIC #5 »,
 * else the project or the artist alone; a label or brand deal leads with
 * who PDS negotiates with: « Universal · Jay », « Philips ». */
export function dealName(
  deal: Pick<
    Deal,
    "artistName" | "titleLabel" | "titlePosition" | "projectTitle"
  > &
    Partial<Pick<Deal, "counterpartName">>,
): string {
  const title =
    deal.titleLabel ??
    (deal.titlePosition !== null ? t.title(deal.titlePosition) : null);
  const what = title ?? deal.projectTitle;
  if (deal.counterpartName) {
    const about = deal.artistName ?? what;
    return about ? t.join(deal.counterpartName, about) : deal.counterpartName;
  }
  if (deal.artistName && what) return t.join(deal.artistName, what);
  return deal.artistName ?? what ?? t.fallback;
}
