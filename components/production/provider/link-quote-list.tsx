import { QuoteVersionList } from "@/components/production/quotes/quote-version-row";
import { fr } from "@/lib/i18n/fr";
import type { LinkJourney } from "@/lib/production/provider/journey";

/** The versions of the quote as the company reads them on its link: its
 * own note, what PDS asked or why it refused; never the internal checks. */
export function LinkQuoteList({
  quotes,
  company,
}: {
  quotes: LinkJourney["quotes"];
  company: string;
}) {
  if (quotes.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-semibold">{fr.productionQuotes.versions}</h3>
      <QuoteVersionList
        quotes={quotes.map((q) => ({
          number: q.number,
          label: q.label,
          amountCents: q.amountCents,
          locBudgetCents: q.locBudgetCents,
          url: q.url,
          note: q.note,
          depositedBy: company,
          depositedAt: q.depositedAt,
          status: q.status,
          decidedBy: null,
          decidedAt: null,
          comments: [
            q.note && { who: company, text: q.note },
            q.reason && { who: fr.productionLink.quote.pds, text: q.reason },
          ].filter((c): c is { who: string; text: string } => Boolean(c)),
        }))}
      />
    </section>
  );
}
