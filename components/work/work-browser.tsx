"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

import { EmptyNote } from "@/components/shell/empty-state";
import { DataTableViews } from "@/components/ui/data-table-views";
import { WorkTable } from "@/components/work/work-table";
import { work } from "@/lib/i18n/fr/work";
import {
  WORK_VIEWS,
  inView,
  type WorkRow,
  type WorkView,
} from "@/lib/work/rows";

const fr = { work };

const VIEW_PARAM = "vue";

/**
 * The global Travail's tabs over its table: Tout | À faire | À valider | En
 * retard, each count being exactly the rows shown. Filtered in place (the
 * rows are already here), the tab kept in the URL like the Projects page.
 */
export function WorkBrowser({ rows }: { rows: WorkRow[] }) {
  const t = fr.work.table;
  const params = useSearchParams();
  const pathname = usePathname();
  const initial = params.get(VIEW_PARAM);
  const [view, setView] = useState<WorkView>(
    (WORK_VIEWS as readonly string[]).includes(initial ?? "")
      ? (initial as WorkView)
      : "all",
  );

  const select = (next: WorkView) => {
    setView(next);
    const query = new URLSearchParams(params.toString());
    if (next === "all") query.delete(VIEW_PARAM);
    else query.set(VIEW_PARAM, next);
    const text = query.toString();
    window.history.replaceState(
      null,
      "",
      text ? `${pathname}?${text}` : pathname,
    );
  };

  const shown = rows.filter((row) => inView(row, view));
  const tabs = WORK_VIEWS.map((key) => ({
    label: t.views[key],
    count: rows.filter((row) => inView(row, key)).length,
    current: view === key,
    onSelect: () => select(key),
  }));

  return (
    <DataTableViews label={t.viewsLabel} views={tabs}>
      {shown.length === 0 ? (
        <EmptyNote>{t.viewEmpty[view]}</EmptyNote>
      ) : (
        <WorkTable rows={shown} />
      )}
    </DataTableViews>
  );
}
