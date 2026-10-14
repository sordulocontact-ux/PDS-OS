import { PageSection } from "@/components/shell/page-section";
import { EmptyNote } from "@/components/shell/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { quoteChecks } from "@/lib/production/quotes/check";
import type { ProductionQuote } from "@/lib/production/quotes/queries";
import { formatDate } from "@/lib/release/format";

import { AddQuoteButton } from "./add-quote-button";
import { QuoteCheckForm } from "./quote-check-form";
import { QuoteDecisionForm } from "./quote-decision-form";

const t = fr.productionQuotes;
const TONE = {
  deposited: "warning",
  submitted: "action",
  approved: "success",
  rejected: "danger",
} as const;

/**
 * The quotes of a production (Ibé, 14/10): each deposited, checked point by
 * point by the line producer — PO prepares the comparison with the envelope
 * and the dates —, submitted, then approved or refused with a reason by its
 * validator. Each person sees the action that is theirs.
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
  handlerName,
}: {
  projectId: string;
  sheetId: string;
  quotes: ProductionQuote[];
  frame: { envelopeCents: number | null; deliveryDate: string | null };
  external: boolean;
  companyName: string;
  validatorName: string | null;
  canOrganize: boolean;
  isValidator: boolean;
  // Who checks: the line producer, else the owner.
  handlerName: string;
}) {
  return (
    <PageSection
      id="quotes"
      title={t.title}
      description={t.description}
      card
      action={
        canOrganize ? (
          <AddQuoteButton projectId={projectId} sheetId={sheetId} />
        ) : undefined
      }
    >
      {quotes.length === 0 ? (
        <EmptyNote>
          {external ? t.empty.external(companyName) : t.empty.internal}
        </EmptyNote>
      ) : (
        <ul className="flex flex-col gap-4">
          {quotes.map((q) => (
            <li
              key={q.id}
              className="flex flex-col gap-3 rounded-xl border border-[color:var(--border-hairline)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold break-words">{q.label}</span>
                <StatusBadge size="sm" tone={TONE[q.status]}>
                  {t.status[q.status]}
                </StatusBadge>
              </div>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums">
                <span>
                  {t.amount}{" "}
                  <b className="text-foreground">
                    {formatEuros(q.amountCents)}
                  </b>
                </span>
                {q.deliveryOn && (
                  <span>
                    {t.delivery} {formatDate(q.deliveryOn)}
                  </span>
                )}
                <span>
                  {t.deposited(
                    q.depositedBy ?? t.byLink,
                    formatDate(q.depositedAt),
                  )}
                </span>
                {q.url && (
                  <a
                    href={q.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4"
                  >
                    {t.fields.url}
                  </a>
                )}
              </p>
              {q.note && <p className="text-sm break-words">« {q.note} »</p>}
              {q.status === "deposited" &&
                (canOrganize && validatorName ? (
                  <section className="flex flex-col gap-2">
                    <h4 className="text-sm font-semibold">{t.check.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t.check.note}
                    </p>
                    <QuoteCheckForm
                      projectId={projectId}
                      quoteId={q.id}
                      checks={quoteChecks(q, frame)}
                      validatorName={validatorName}
                    />
                  </section>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t.wait.check(handlerName)}
                  </p>
                ))}
              {q.status === "submitted" && (
                <>
                  {q.submittedBy && q.submittedAt && (
                    <p className="text-sm text-muted-foreground">
                      {t.decide.checkedBy(
                        q.submittedBy,
                        formatDate(q.submittedAt),
                      )}
                    </p>
                  )}
                  {q.checkNote && (
                    <ToneCallout tone="info">« {q.checkNote} »</ToneCallout>
                  )}
                  {isValidator ? (
                    <QuoteDecisionForm projectId={projectId} quoteId={q.id} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t.wait.decide(validatorName ?? "—")}
                    </p>
                  )}
                </>
              )}
              {q.status === "rejected" && q.reason && (
                <ToneCallout tone="danger">
                  {t.decide.decidedBy(
                    t.status.rejected,
                    q.decidedBy ?? "—",
                    formatDate(q.decidedAt ?? q.depositedAt),
                  )}{" "}
                  : « {q.reason} »
                </ToneCallout>
              )}
              {q.status === "approved" && (
                <ToneCallout tone="success">
                  {t.decide.decidedBy(
                    t.status.approved,
                    q.decidedBy ?? "—",
                    formatDate(q.decidedAt ?? q.depositedAt),
                  )}
                </ToneCallout>
              )}
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
