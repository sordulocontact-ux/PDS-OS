import Link from "next/link";

import { PageSection } from "@/components/shell/page-section";
import type { ActivityEvent } from "@/lib/catalog/activity-types";
import { fr } from "@/lib/i18n/fr";

import { formatActivityTime, groupByDay } from "./activity-days";
import { activitySentence } from "./activity-sentence";

// The artist's log, one section per day, newest first. Each row: time, the
// sentence (a link to the master or project when there is one), the actor.
export function ArtistActivity({
  events,
  now,
  truncated,
}: {
  events: ActivityEvent[];
  now: Date;
  truncated: boolean;
}) {
  const t = fr.artistActivity;
  return (
    <div className="flex flex-col gap-[var(--section-gap)]">
      {groupByDay(events, now).map((day) => (
        <PageSection key={day.key} id={`day-${day.key}`} title={day.label}>
          <ol className="flex flex-col divide-y divide-border">
            {day.events.map((event) => (
              <ActivityRow key={event.id} event={event} />
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

function ActivityRow({ event }: { event: ActivityEvent }) {
  const sentence = activitySentence(event);
  const time = formatActivityTime(event.createdAt);
  return (
    <li className="flex gap-4 py-3">
      <time
        dateTime={event.createdAt}
        className="w-12 shrink-0 text-sm text-muted-foreground tabular-nums"
      >
        {time}
      </time>
      <div className="flex min-w-0 flex-col gap-0.5">
        {event.href ? (
          <Link
            href={event.href}
            className="w-fit rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {sentence}
          </Link>
        ) : (
          <span className="font-medium">{sentence}</span>
        )}
        {event.actorName && (
          <span className="text-sm text-muted-foreground">
            {fr.artistActivity.by(event.actorName)}
          </span>
        )}
      </div>
    </li>
  );
}
