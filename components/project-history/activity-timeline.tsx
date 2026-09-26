import Link from "next/link";

import type { ActivityEvent } from "@/lib/insights/activity";
import { daysAgo, todayInParis } from "@/lib/insights/dates";
import { fr } from "@/lib/i18n/fr";
import {
  formatLongDay,
  formatTime,
  groupByDay,
} from "@/lib/project-history/format";

// "call créé" → "Call créé": the assistant's labels, read as a line start.
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// The project journal, one block per Paris day (today, yesterday, then the
// date), each event with its time, kind and detail, linked to its page.
export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
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
      {groupByDay(events).map((group) => (
        <section
          key={group.day}
          aria-labelledby={`day-${group.day}`}
          className="grid gap-3"
        >
          <h3 id={`day-${group.day}`} className="text-caption text-grey-400">
            {dayTitle(group.day, group.events[0].at)}
          </h3>
          <ol className="grid gap-1">
            {group.events.map((event, i) => (
              <li key={`${event.at}-${event.kind}-${i}`}>
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
                      {capitalize(
                        fr.assistant.activityKinds[event.kind] ?? event.kind,
                      )}
                    </span>
                    <span className="break-words text-muted-foreground">
                      {event.detail}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
