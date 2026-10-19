import { StatusBadge } from "@/components/ui/status-badge";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import type { LinkJourney } from "@/lib/production/provider/journey";
import { formatDate } from "@/lib/release/format";

const t = fr.productionLink;
const QUOTE_TONE = {
  deposited: "warning",
  submitted: "action",
  approved: "success",
  rejected: "danger",
} as const;

/** The quotes the company deposited through its link, with their status
 * and, when refused, the reason. */
export function LinkQuoteList({ quotes }: { quotes: LinkJourney["quotes"] }) {
  return (
    <>
      {quotes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {quotes.map((q) => (
            <li
              key={q.id}
              className="flex flex-col gap-1 rounded-lg border border-[color:var(--border-hairline)] px-3 py-2.5 text-sm"
            >
              <span className="flex flex-wrap items-center justify-between gap-2">
                <b>{q.label}</b>
                <StatusBadge size="sm" tone={QUOTE_TONE[q.status]}>
                  {t.quote.status[q.status]}
                </StatusBadge>
              </span>
              <span className="text-muted-foreground tabular-nums">
                {formatEuros(q.amountCents)}
                {q.deliveryOn && ` · ${formatDate(q.deliveryOn)}`}
              </span>
              {q.status === "rejected" && q.reason && (
                <span>{t.quote.reason(q.reason)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
