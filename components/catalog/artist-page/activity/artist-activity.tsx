import { ActivityLog } from "@/components/catalog/activity/activity-log";
import type { ActivityEvent } from "@/lib/catalog/activity-types";

import { activitySentence } from "./activity-sentence";

// The artist's log: each event becomes a sentence, then the common log.
export function ArtistActivity({
  events,
  now,
  truncated,
}: {
  events: ActivityEvent[];
  now: Date;
  truncated: boolean;
}) {
  return (
    <ActivityLog
      entries={events.map((event) => ({
        id: event.id,
        createdAt: event.createdAt,
        sentence: activitySentence(event),
        href: event.href,
        actorName: event.actorName,
      }))}
      now={now}
      truncated={truncated}
    />
  );
}
