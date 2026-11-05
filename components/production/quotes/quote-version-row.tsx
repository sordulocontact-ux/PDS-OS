import { StatusBadge } from "@/components/ui/status-badge";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
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
 * One version of the quote (proto quoteRow): « V1 · 16 400 € HT dont lieux
 * 1 800 € HT · file », who deposited it and when, who decided, what was
 * said, its state and « Voir le devis ». The same in the step and on the
 * company's link.
 */
export function QuoteVersionRow({ q }: { q: QuoteVersionView }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--border-hairline)] px-4 py-3 last:border-b-0">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
        <span>
          <b className="font-semibold tabular-nums">
            {t.line(q.number, formatEuros(q.amountCents))}
          </b>
          {q.locBudgetCents !== null && (
            <span className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
              {" "}
              {t.loc(formatEuros(q.locBudgetCents))}
            </span>
          )}
          {` · ${q.label}`}
        </span>
        <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
          {t.deposited(q.depositedBy, shortStamp(q.depositedAt))}
          {q.decidedBy &&
            q.decidedAt &&
            t.decided(
              q.status === "approved" ? t.verbs.approved : t.verbs.other,
              q.decidedBy,
              shortStamp(q.decidedAt),
            )}
        </span>
        {q.comments.map((c, i) => (
          <span
            key={i}
            className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-secondary)]"
          >
            {t.said(c.who, c.text)}
          </span>
        ))}
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <StatusBadge size="sm" tone={TONE[q.status]}>
          {t.status[q.status]}
        </StatusBadge>
        {q.url && (
          <a
            href={q.url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ButtonRoll>{t.open}</ButtonRoll>
          </a>
        )}
      </span>
    </li>
  );
}

/** The versions, newest first, in one frame. */
export function QuoteVersionList({ quotes }: { quotes: QuoteVersionView[] }) {
  return (
    <ul className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)]">
      {quotes.map((q) => (
        <QuoteVersionRow key={q.number} q={q} />
      ))}
    </ul>
  );
}
