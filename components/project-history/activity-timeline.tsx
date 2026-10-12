import Link from "next/link";

import { DayGroups } from "@/components/ui/day-groups";
import type { ActivityEvent } from "@/lib/insights/activity";
import { fr } from "@/lib/i18n/fr";
import { formatTime } from "@/lib/project-history/format";

// "call créé" → "Call créé": the assistant's labels, read as a line start.
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// The project journal, one block per Paris day (today, yesterday, then the
// date), each event with its time, kind and detail, linked to its page.
export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  return (
    <DayGroups
      items={events}
      idPrefix="day"
      keyOf={(event, i) => `${event.at}-${event.kind}-${i}`}
    >
      {(event) => (
        <Link
          href={event.href}
          className="-mx-2 flex items-baseline gap-4 rounded-lg px-2 py-1.5 hover:bg-[var(--control-bg-hover)]"
        >
          <time
            dateTime={event.at}
            className="w-12 shrink-0 text-sm text-muted-foreground tabular-nums"
          >
            {formatTime(event.at)}
          </time>
          <span className="grid min-w-0 gap-0.5 text-body-md">
            <span className="font-semibold">
              {capitalize(fr.assistant.activityKinds[event.kind] ?? event.kind)}
            </span>
            <span className="break-words text-muted-foreground">
              {event.detail}
            </span>
          </span>
        </Link>
      )}
    </DayGroups>
  );
}
