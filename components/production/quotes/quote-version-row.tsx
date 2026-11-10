import {
  DeliverableVersion,
  DeliverableVersions,
} from "@/components/ui/deliverable-version";
import { formatEuros } from "@/lib/budget/types";
import { shortStamp } from "@/lib/calls/prep/dates";
import { productionQuotes } from "@/lib/i18n/fr/production-quotes";
import type { QuoteStatus } from "@/lib/production/quotes/queries";

const fr = { productionQuotes };

const t = fr.productionQuotes;
const TONE = {
  deposited: "info",
  submitted: "info",
  approved: "success",
  changes: "warning",
  rejected: "danger",
  replaced: "neutral",
} as const;

export type QuoteVersionView = {
  number: number;
  label: string;
  amountCents: number;
  locBudgetCents: number | null;
  url: string | null;
  note: string | null;
  depositedBy: string;
  depositedAt: string;
  status: QuoteStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  // Said along the way: the company's note, the requests, a refusal.
  comments: { who: string; text: string }[];
};

/**
 * One version of the quote (proto quoteRow), as a `DeliverableVersion`:
 * « V1 · 16 400 € HT », who deposited it and when, who decided, its state and
 * « Voir le devis », then its label, the share for the places and what was
 * said. The same in the step and on the company's link.
 */
export function QuoteVersionRow({ q }: { q: QuoteVersionView }) {
  return (
    <DeliverableVersion
      name={t.line(q.number, formatEuros(q.amountCents))}
      line={
        <>
          {t.deposited(q.depositedBy, shortStamp(q.depositedAt))}
          {q.decidedBy &&
            q.decidedAt &&
            t.decided(
              q.status === "approved" ? t.verbs.approved : t.verbs.other,
              q.decidedBy,
              shortStamp(q.decidedAt),
            )}
        </>
      }
      statuses={[{ tone: TONE[q.status], label: t.status[q.status] }]}
      open={q.url ? { href: q.url, label: t.open } : null}
    >
      <p className="break-words">
        {q.label}
        {q.locBudgetCents !== null && (
          <span className="text-[color:var(--text-secondary)]">
            {" · "}
            {t.loc(formatEuros(q.locBudgetCents))}
          </span>
        )}
      </p>
      {q.comments.map((c, i) => (
        <p
          key={i}
          className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]"
        >
          {t.said(c.who, c.text)}
        </p>
      ))}
    </DeliverableVersion>
  );
}

/** The versions, newest first: the latest open, the others folded. */
export function QuoteVersionList({ quotes }: { quotes: QuoteVersionView[] }) {
  return (
    <DeliverableVersions
      versions={quotes.map((q) => ({ ...q, id: String(q.number) }))}
      isCurrent={(_, i) => i === 0}
      render={(q) => <QuoteVersionRow q={q} />}
      earlierTitle={t.earlier}
    />
  );
}
