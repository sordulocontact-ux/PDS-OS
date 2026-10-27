import Link from "next/link";

import { PageSection } from "@/components/shell/page-section";
import { artistActivity } from "@/lib/i18n/fr/artist-activity";

import { formatActivityTime, groupByDay } from "./activity-days";

const fr = { artistActivity };

/** One line of a log, its sentence already written by the code. */
export type ActivityEntry = {
  id: string;
  createdAt: string;
  sentence: string;
  // Page the event is about (a master, a project), when there is one.
  href: string | null;
  // Empty when the person is not visible to the viewer or the server acted.
  actorName: string;
};

// The log of an artist or a master, one section per day, newest first. Each
// row: time, the sentence (a link when there is a page), the actor.
export function ActivityLog({
  entries,
  now,
  truncated,
}: {
  entries: ActivityEntry[];
  now: Date;
  truncated: boolean;
}) {
  const t = fr.artistActivity;
  return (
    <div className="flex flex-col gap-[var(--section-gap)]">
      {groupByDay(entries, now).map((day) => (
        <PageSection key={day.key} id={`day-${day.key}`} title={day.label}>
          <ol className="flex flex-col divide-y divide-border in-[.section-card]:divide-y-0">
            {day.events.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </ol>
        </PageSection>
      ))}
      {truncated && (
        <p className="text-sm text-muted-foreground">{t.limitNote}</p>
      )}
    </div>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  return (
    <li className="flex gap-4 py-3">
      <time
        dateTime={entry.createdAt}
        className="w-12 shrink-0 text-sm text-muted-foreground tabular-nums"
      >
        {formatActivityTime(entry.createdAt)}
      </time>
      <div className="flex min-w-0 flex-col gap-0.5">
        {entry.href ? (
          <Link
            href={entry.href}
            className="w-fit rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {entry.sentence}
          </Link>
        ) : (
          <span className="font-medium">{entry.sentence}</span>
        )}
        {entry.actorName && (
          <span className="text-sm text-muted-foreground">
            {fr.artistActivity.by(entry.actorName)}
          </span>
        )}
      </div>
    </li>
  );
}
