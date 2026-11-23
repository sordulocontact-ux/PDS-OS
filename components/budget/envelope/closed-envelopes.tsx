import { PageSection } from "@/components/shell/page-section";
import { Rows } from "@/components/ui/rows";
import type { ArtistEnvelope } from "@/lib/budget/envelope";
import { formatEuros } from "@/lib/budget/types";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";
import { formatDay } from "@/lib/utils/day";

const fr = { artistBudget };

/**
 * The artist's closed envelopes (BUD 2), each with its period, its amount and
 * what it consumed. Records one opens, not a journal of events: nothing is
 * shown without a closed envelope.
 */
export function ClosedEnvelopes({
  closed,
}: {
  closed: (ArtistEnvelope & { spentCents: number })[];
}) {
  const t = fr.artistBudget.closed;
  if (closed.length === 0) return null;
  return (
    <PageSection id="artist-budget-closed" title={t.title}>
      <Rows label={t.title}>
        {closed.map((e) => (
          <li
            key={e.id}
            className="flex flex-col gap-0.5 px-4 py-3 text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)]"
          >
            {t.line(
              fr.artistBudget.envelope.period(
                formatDay(e.startsOn),
                e.endsOn && formatDay(e.endsOn),
              ),
              formatEuros(e.amountCents),
              formatEuros(e.spentCents),
            )}
          </li>
        ))}
      </Rows>
    </PageSection>
  );
}
