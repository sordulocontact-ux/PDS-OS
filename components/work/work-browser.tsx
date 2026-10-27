"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ContentCard } from "@/components/shell/content-card";
import { EmptyNote } from "@/components/shell/empty-state";
import { DataTableViews } from "@/components/ui/data-table-views";
import { Rows } from "@/components/ui/rows";
import { work } from "@/lib/i18n/fr/work";
import {
  WORK_GROUPS,
  WORK_VIEWS,
  inView,
  type WorkRow,
  type WorkView,
} from "@/lib/work/rows";

import { WorkRowLink } from "./work-row";

const fr = { work };

const VIEW_PARAM = "vue";

/**
 * The global Travail under its lead: tabs Tout | À faire | À valider, each
 * count being every action of the view (« Maintenant » included), then the
 * rows grouped by when — En retard, Cette semaine, Plus tard, Sans
 * échéance, and what waits for someone else. Filtered in place (the rows are already here), the tab kept
 * in the URL like the Projects page. `lead`: the row « Maintenant » shows,
 * never repeated here.
 */
export function WorkBrowser({
  rows,
  lead,
}: {
  rows: WorkRow[];
  lead: string | null;
}) {
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

  const listed = rows.filter((row) => row.key !== lead);
  const shown = listed.filter((row) => inView(row, view));
  const tabs = WORK_VIEWS.map((key) => ({
    label: t.views[key],
    count: rows.filter((row) => inView(row, key)).length,
    current: view === key,
    onSelect: () => select(key),
  }));
  const groups = WORK_GROUPS.map((group) => ({
    group,
    rows: shown.filter((row) => row.group === group),
  })).filter(({ rows: own }) => own.length > 0);

  return (
    <DataTableViews label={t.viewsLabel} views={tabs}>
      {groups.length === 0 ? (
        <EmptyNote>{t.viewEmpty[view]}</EmptyNote>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(({ group, rows: own }) => (
            <ContentCard
              key={group}
              title={t.groupTitle(t.groups[group], own.length)}
            >
              <Rows>
                {own.map((row) => (
                  <WorkRowLink key={row.key} row={row} />
                ))}
              </Rows>
            </ContentCard>
          ))}
        </div>
      )}
    </DataTableViews>
  );
}
