import type { ReactNode } from "react";

import { daysAgo, todayInParis } from "@/lib/insights/dates";
import { projectHistory } from "@/lib/i18n/fr/project-history";
import { formatLongDay, groupByDay } from "@/lib/project-history/format";

const fr = { projectHistory };

/**
 * A journal, newest first, one block per Paris day (« Aujourd'hui »,
 * « Hier », then the date): the project's Activité and the Historique du
 * Juridique. Each item is drawn by the caller.
 */
export function DayGroups<T extends { at: string }>({
  items,
  idPrefix,
  keyOf,
  children,
}: {
  items: T[];
  // Keeps the headings' ids unique on the page.
  idPrefix: string;
  keyOf: (item: T, index: number) => string;
  children: (item: T) => ReactNode;
}) {
  const t = fr.projectHistory.activity;
  const today = todayInParis();
  const yesterday = todayInParis(new Date(daysAgo(1)));
  const dayTitle = (day: string, at: string) =>
    day === today
      ? t.today
      : day === yesterday
        ? t.yesterday
        : formatLongDay(at);

  return (
    <div className="grid gap-8">
      {groupByDay(items).map((group) => (
        <section
          key={group.day}
          aria-labelledby={`${idPrefix}-${group.day}`}
          className="grid gap-3"
        >
          <h3
            id={`${idPrefix}-${group.day}`}
            className="text-caption text-grey-400"
          >
            {dayTitle(group.day, group.events[0].at)}
          </h3>
          <ol className="grid gap-1">
            {group.events.map((item, i) => (
              <li key={keyOf(item, i)}>{children(item)}</li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
