import type { TabBarItem } from "@/components/ui/tab-bar";
import type { RecordCounts } from "@/lib/archive/types";
import { records } from "@/lib/i18n/fr/records";
import { viewHref } from "@/lib/ui/view-href";

const fr = { records };

// Actifs / Archivés as the tabs of a list page (director only, in the URL:
// ?view=archived), with their counts. Anyone else gets a single view, so no
// tabs at all (DataTableViews).
export function archiveViews({
  path,
  archived,
  counts,
}: {
  path: string;
  archived: boolean;
  counts: RecordCounts | null;
}): TabBarItem[] {
  if (!counts) return [];
  const t = fr.records.view;
  return [
    {
      href: path,
      label: t.live,
      count: counts.live,
      current: !archived,
    },
    {
      href: viewHref(path, { view: "archived" }),
      label: t.archived,
      count: counts.archived,
      current: archived,
    },
  ];
}
