import { PageSection } from "@/components/shell/page-section";
import type { Closure, HistoryEvent } from "@/lib/distribution/closure-queries";
import { eventText } from "@/lib/distribution/history";
import { distribution } from "@/lib/i18n/fr/distribution";
import { formatDateTime, formatShortDate } from "@/lib/release/format";

const fr = { distribution };

const t = fr.distribution;

/**
 * Everything that happened on the Distribution (§ 10, CA17): the closures
 * with their reserves and reopenings, then every event the database
 * recorded — who, what, when — newest first. Nothing is ever removed.
 */
export function DistributionHistory({
  closures,
  events,
}: {
  closures: Closure[];
  events: HistoryEvent[];
}) {
  return (
    <div className="grid gap-6">
      {closures.length > 0 && (
        <PageSection id="closure-history" title={t.closure.historyTitle} card>
          <ul className="grid gap-4">
            {closures.map((closure) => (
              <li key={closure.id} className="grid gap-0.5">
                <p className="font-medium">
                  {t.closure.historyLine(
                    t.closure.kinds[closure.kind],
                    closure.reopened
                      ? t.closure.statuses.reopened
                      : t.closure.statuses[closure.status],
                    formatShortDate(closure.proposedAt),
                  )}
                </p>
                {closure.reserves.length > 0 && (
                  <ul className="grid gap-0.5 text-sm text-muted-foreground">
                    {closure.reserves.map((reserve) => (
                      <li key={reserve.cause}>{reserve.label}</li>
                    ))}
                  </ul>
                )}
                {closure.decisionNote && (
                  <p className="text-sm break-words text-muted-foreground">
                    {t.history.note(closure.decisionNote)}
                  </p>
                )}
                {closure.reopened && (
                  <p className="text-sm break-words text-muted-foreground">
                    {t.closure.reopenedLine(
                      formatShortDate(closure.reopened.at),
                      closure.reopened.by,
                      closure.reopened.note,
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </PageSection>
      )}

      <PageSection
        id="distribution-history"
        title={t.history.title}
        description={t.history.description}
        card
      >
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.history.empty}</p>
        ) : (
          <ol className="grid gap-3">
            {events.map((event) => {
              const { text, note } = eventText(event.kind, event.data);
              return (
                <li key={event.id} className="grid gap-0.5">
                  <p className="font-medium break-words">{text}</p>
                  <p className="text-sm text-muted-foreground">
                    {[event.actor, formatDateTime(event.at)]
                      .filter(Boolean)
                      .join(" · ")}
                    {note && (
                      <span className="break-words">
                        {" "}
                        · {t.history.note(note)}
                      </span>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </PageSection>
    </div>
  );
}
