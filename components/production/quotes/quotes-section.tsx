import { EmptyNote } from "@/components/shell/empty-state";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatEuros } from "@/lib/budget/types";
import { shortStamp } from "@/lib/calls/prep/dates";
import { productionQuotes } from "@/lib/i18n/fr/production-quotes";
import { quoteComputed } from "@/lib/production/quotes/check";
import type { ProductionQuote } from "@/lib/production/quotes/queries";
import { formatShortDay } from "@/lib/utils/day";

import { AddQuoteButton } from "./add-quote-button";
import { QuoteCheckForm } from "./quote-check-form";
import { QuoteDecisionForm } from "./quote-decision-form";
import { QuoteRevisionForm } from "./quote-revision-form";
import { QuoteVersionList, type QuoteVersionView } from "./quote-version-row";

const fr = { productionQuotes };

const t = fr.productionQuotes;

/**
 * The quote in versions (proto BODY.quote): the active reference and the
 * revision asked, « Versions du devis », then the action of the person
 * looking — the line producer checks (« Soumettre à … » or « Demander une
 * modification »), the budget validation decides, whoever organises may ask
 * for a revision once validated. What others wait for is said by the step.
 */
export function QuotesSection({
  projectId,
  sheetId,
  quotes,
  frame,
  external,
  companyName,
  validatorName,
  canOrganize,
  isValidator,
  revision,
}: {
  projectId: string;
  sheetId: string;
  quotes: ProductionQuote[];
  frame: {
    envelopeCents: number | null;
    shootDate: string | null;
    deliveryDate: string | null;
    shootDays: number;
  };
  external: boolean;
  companyName: string;
  validatorName: string | null;
  canOrganize: boolean;
  isValidator: boolean;
  revision: { reason: string; by: string | null; at: string } | null;
}) {
  const last = quotes[0] ?? null;
  const active = quotes.find((q) => q.status === "approved") ?? null;
  const view = (q: ProductionQuote): QuoteVersionView => ({
    number: q.number,
    label: q.label,
    amountCents: q.amountCents,
    locBudgetCents: q.locBudgetCents,
    url: q.url,
    note: q.note,
    depositedBy: q.depositedBy ?? companyName,
    depositedAt: q.depositedAt,
    status: q.status,
    decidedBy: q.decidedBy,
    decidedAt: q.decidedAt,
    comments: [
      q.note && { who: q.depositedBy ?? companyName, text: q.note },
      q.checkNote && { who: q.submittedBy ?? "—", text: q.checkNote },
      q.reason && { who: q.decidedBy ?? "—", text: q.reason },
    ].filter((c): c is { who: string; text: string } => Boolean(c)),
  });
  return (
    <div className="flex flex-col gap-4">
      {active && (
        <ToneCallout tone="success">
          <b className="font-semibold">
            {t.active(active.number, formatEuros(active.amountCents))}
          </b>
          {t.activeBy(
            active.decidedBy ?? "—",
            shortStamp(active.decidedAt ?? active.depositedAt),
          )}
          {quotes.length > 1 && t.previous}
        </ToneCallout>
      )}
      {revision && (
        <ToneCallout tone="warning">
          <b className="font-semibold">
            {t.revision.asked(revision.by ?? "—", formatShortDay(revision.at))}
          </b>
          « {revision.reason} »
        </ToneCallout>
      )}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{t.versions}</h3>
          {canOrganize && (
            <AddQuoteButton projectId={projectId} sheetId={sheetId} />
          )}
        </div>
        {quotes.length === 0 ? (
          <EmptyNote>
            {external ? t.empty.external(companyName) : t.empty.internal}
          </EmptyNote>
        ) : (
          <QuoteVersionList quotes={quotes.map(view)} />
        )}
      </section>
      {last?.status === "deposited" && canOrganize && validatorName && (
        <QuoteCheckForm
          projectId={projectId}
          quoteId={last.id}
          number={last.number}
          computed={quoteComputed(last, frame)}
          delayText={t.check.delay(
            frame.shootDate
              ? formatShortDay(frame.shootDate, { bare: true })
              : null,
            frame.deliveryDate
              ? formatShortDay(frame.deliveryDate, { bare: true })
              : null,
          )}
          validatorName={validatorName}
          companyName={external ? companyName : t.byLink}
        />
      )}
      {last?.status === "submitted" && isValidator && (
        <QuoteDecisionForm
          projectId={projectId}
          quoteId={last.id}
          number={last.number}
          checkedBy={last.submittedBy}
        />
      )}
      {active && last === active && !revision && canOrganize && (
        <QuoteRevisionForm
          projectId={projectId}
          sheetId={sheetId}
          activeNumber={active.number}
          companyName={external ? companyName : t.byLink}
        />
      )}
    </div>
  );
}
