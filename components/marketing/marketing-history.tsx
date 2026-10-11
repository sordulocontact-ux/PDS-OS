import { EmptyNote } from "@/components/shell/empty-state";
import { fr } from "@/lib/i18n/fr";
import type { MarketingEvent } from "@/lib/marketing/queries";
import {
  formatLongDay,
  formatTime,
  groupByDay,
} from "@/lib/project-history/format";

const t = fr.marketing.events;

/**
 * The audit of the Marketing follow-up, one block per Paris day: what
 * happened, who did it, the fields that changed and the reason given.
 * Written by the database's triggers, never by the screen.
 */
export function MarketingHistory({
  events,
  emptyLabel,
}: {
  events: MarketingEvent[];
  emptyLabel: string;
}) {
  if (events.length === 0) return <EmptyNote>{emptyLabel}</EmptyNote>;
  const grouped = groupByDay(events.map((e) => ({ ...e, at: e.createdAt })));
  return (
    <div className="grid gap-6">
      {grouped.map((group) => (
        <section
          key={group.day}
          aria-labelledby={`history-${group.day}`}
          className="grid gap-2"
        >
          <h3
            id={`history-${group.day}`}
            className="text-caption text-muted-foreground"
          >
            {formatLongDay(group.events[0].at)}
          </h3>
          <ol className="grid gap-2">
            {group.events.map((event) => {
              const changed = event.newValue
                ? Object.keys(event.newValue)
                    .map((key) => t.fields[key])
                    .filter(Boolean)
                : [];
              const detail = [
                event.kind.endsWith(".updated") && changed.length > 0
                  ? t.changed([...new Set(changed)].join(", "))
                  : null,
                event.reason ? t.reason(event.reason) : null,
              ].filter(Boolean);
              return (
                <li key={event.id} className="flex items-baseline gap-4">
                  <time
                    dateTime={event.createdAt}
                    className="w-12 shrink-0 text-sm text-muted-foreground tabular-nums"
                  >
                    {formatTime(event.createdAt)}
                  </time>
                  <span className="grid min-w-0 gap-0.5 text-body-md">
                    <span className="font-semibold">
                      {fr.marketingReview.events[event.kind] ?? t.other}
                      {event.actorName && (
                        <span className="font-medium text-muted-foreground">
                          {" "}
                          {t.by(event.actorName)}
                        </span>
                      )}
                    </span>
                    {detail.length > 0 && (
                      <span className="break-words text-muted-foreground">
                        {detail.join(" · ")}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
