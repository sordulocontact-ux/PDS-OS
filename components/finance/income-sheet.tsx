import { SheetFacts, SheetHead } from "@/components/finance/finance-sheet";
import { RecordHistory } from "@/components/finance/record-history";
import { Button } from "@/components/ui/button";
import type { RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  awaitedOn,
  daysLate,
  htCents,
  incomeState,
  lastReminder,
  receivedCents,
  remainingCents,
  type Income,
} from "@/lib/finance/money-in";
import { financeSheet } from "@/lib/i18n/fr/finance-home";
import { treasury } from "@/lib/i18n/fr/treasury";
import { incomeStateTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const t = financeSheet.income;
const amount = (cents: number) => formatAmount(cents, { ht: false });

/** Money in (an expected income, a client invoice) in Finance's side sheet
 * (lot 3): its amount, what is left, the follow-up of a late one (Ibé's
 * ticket, « Relances »), what came in and was noted, its gestures, then
 * its history. */
export function IncomeSheet({
  income,
  target,
  today,
  actions,
}: {
  income: Income;
  target: string;
  today: string;
  actions: RowAction[];
}) {
  const state = incomeState(income, today);
  const late = state === "late" ? daysLate(income, today) : 0;
  const last = lastReminder(income);
  const events = [
    ...income.receipts.map((r) => ({
      key: r.id,
      day: r.receivedOn,
      text: t.receipt(amount(r.cents)),
    })),
    ...income.reminders.map((r) => ({
      key: r.id,
      day: r.remindedOn,
      text: t.reminder,
    })),
  ].sort((a, b) => b.day.localeCompare(a.day));
  const opt = (label: string, value: string | null) =>
    value ? [{ label, value }] : [];

  return (
    <>
      <SheetHead
        eyebrow={[treasury.kinds[income.kind], income.payer]
          .filter(Boolean)
          .join(" · ")}
        title={income.label}
        amount={amount(income.cents)}
        caption={
          <>
            {htCents(income) !== null && (
              <span>{t.ht(amount(htCents(income) ?? 0))}</span>
            )}
            <StatusBadge tone={incomeStateTone[state]} size="sm">
              {treasury.states[state]}
            </StatusBadge>
          </>
        }
      />
      <SheetFacts
        facts={[
          { label: t.target, value: target },
          { label: t.due, value: formatDay(awaitedOn(income)) },
          ...opt(t.invoice, income.invoiceNumber),
          ...opt(
            t.invoicedOn,
            income.invoicedOn && formatDay(income.invoicedOn),
          ),
          ...opt(t.sentOn, income.sentOn && formatDay(income.sentOn)),
          { label: t.received, value: amount(receivedCents(income)) },
          { label: t.left, value: amount(remainingCents(income)) },
          ...(late ? [{ label: t.late, value: t.lateDays(late) }] : []),
          ...opt(t.lastReminder, last && formatDay(last.remindedOn)),
          ...opt(
            t.nextAction,
            income.nextAction &&
              [
                income.nextAction,
                income.nextActionOn && formatDay(income.nextActionOn),
              ]
                .filter(Boolean)
                .join(" · "),
          ),
          ...opt(t.note, income.note),
        ]}
      />
      {actions.length > 0 && (
        <div
          role="group"
          aria-label={financeSheet.actions}
          className="flex flex-wrap gap-2"
        >
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Button
                key={a.key}
                variant="outline"
                size="sm"
                onClick={a.onSelect}
              >
                <Icon aria-hidden data-icon="inline-start" />
                {a.label}
              </Button>
            );
          })}
        </div>
      )}
      {events.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-caption font-semibold text-[color:var(--text-secondary)]">
            {t.activity}
          </h3>
          <ol className="flex flex-col gap-2 text-caption">
            {events.map((e) => (
              <li key={e.key} className="flex justify-between gap-3">
                <span>{e.text}</span>
                <span className="text-[color:var(--text-tertiary)] tabular-nums">
                  {formatDay(e.day)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
      <RecordHistory rowId={income.id} />
    </>
  );
}
