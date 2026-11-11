import { PageSection } from "@/components/shell/page-section";
import { EmptyNote } from "@/components/shell/empty-state";
import { Rows } from "@/components/ui/rows";
import type { ArtistEnvelope } from "@/lib/budget/envelope";
import type { EnvelopeEvent } from "@/lib/budget/envelope-queries";
import { formatEuros } from "@/lib/budget/types";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";
import { Timestamp } from "@/components/ui/timestamp";
import { formatDay } from "@/lib/utils/day";

const fr = { artistBudget };

const rowClass =
  "flex flex-col gap-0.5 px-4 py-3 text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)]";

/**
 * « Historique » of an artist's Budget (BUD 2): the closed envelopes, each
 * with what it consumed, then every opening, change and closing, who and
 * when.
 */
export function EnvelopeHistory({
  history,
  events,
}: {
  history: (ArtistEnvelope & { spentCents: number })[];
  events: EnvelopeEvent[];
}) {
  const t = fr.artistBudget.history;
  const period = (e: ArtistEnvelope) =>
    fr.artistBudget.envelope.period(
      formatDay(e.startsOn),
      e.endsOn && formatDay(e.endsOn),
    );
  const said = (e: EnvelopeEvent) => {
    const who = e.actorName || t.someone;
    const amount = e.amountCents === null ? "" : formatEuros(e.amountCents);
    if (e.kind === "opened") return t.events.opened(who, amount);
    if (e.kind === "closed") return t.events.closed(who);
    return t.events.changed(
      who,
      e.previousCents === null ? null : formatEuros(e.previousCents),
      amount,
    );
  };
  return (
    <PageSection id="artist-budget-history" title={t.title}>
      {history.length === 0 && events.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <div className="flex flex-col gap-4">
          {history.length > 0 && (
            <Rows label={t.title}>
              {history.map((e) => (
                <li key={e.id} className={rowClass}>
                  {t.closedLabel(
                    period(e),
                    formatEuros(e.amountCents),
                    formatEuros(e.spentCents),
                  )}
                </li>
              ))}
            </Rows>
          )}
          {events.length > 0 && (
            <Rows>
              {events.map((e) => (
                <li key={e.id} className={rowClass}>
                  <span>{said(e)}</span>
                  <Timestamp
                    iso={e.at}
                    className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]"
                  />
                </li>
              ))}
            </Rows>
          )}
        </div>
      )}
    </PageSection>
  );
}
