import type { UrlFilterGroup } from "@/components/ui/url-filters";
import { records } from "@/lib/i18n/fr/records";

const fr = { records };

/** Live rows or the archive (?view=archived, director only), behind the
 * filter button of a list (Sacha, 30/10/2026), not beside its tabs. */
export function archiveFilterGroup(archived: boolean): UrlFilterGroup {
  const t = fr.records.view;
  return {
    key: "view",
    label: t.label,
    allLabel: t.live,
    options: [{ value: "archived", label: t.archived }],
    current: archived ? ["archived"] : [],
    menuOnly: true,
  };
}
