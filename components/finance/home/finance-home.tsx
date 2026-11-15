import {
  IconChartBarTrendUp,
  IconFile,
  IconMoneyBillCoin,
  IconPaperclip,
  IconPiggyBank,
  IconTriangleWarning,
} from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import { FinanceAsk } from "@/components/finance/home/finance-ask";
import { SentenceCard, Strong } from "@/components/finance/home/sentence-card";
import { TreasurySpark } from "@/components/finance/home/treasury-spark";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { routes } from "@/lib/auth/redirects";
import { BUDGET_ALERT_SHARE, type Cockpit } from "@/lib/finance/cockpit";
import {
  TREASURY_HORIZONS,
  type Treasury,
  type TreasuryHorizon,
} from "@/lib/finance/treasury";
import { financeHome } from "@/lib/i18n/fr/finance-home";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";
import { spendsHref } from "@/lib/finance/spend-links";

const t = financeHome;
const amount = (cents: number) => formatAmount(cents, { ht: false });
const percent = (share: number) => Math.round(share * 100);

/**
 * Finance › Vue d'ensemble, new style (Sacha 15/11/2026, docs/FINANCE-V2.md,
 * proto « Finance à la Midday » v8): the greeting on the left with the
 * forecast's horizon, then eight cards, each one sentence with its figures in
 * bold, opening its page; the actions under them. Ibé's ticket asks the
 * overview the balance, the 30/60/90-day forecast, the low point and the
 * reserve, money in and out, the budgets and the alerts: each has its card.
 * Lot 7: the first card is the week's summary (`brief`, worded by PO from
 * the code's figures, components/finance/home/finance-brief.tsx), and « Je
 * veux… » under the actions opens PO with a question (`suggestions`).
 */
export function FinanceHome({
  firstName,
  treasury,
  view,
  horizon,
  names,
  actions,
  brief,
  suggestions,
}: {
  firstName: string | null;
  treasury: Treasury | null;
  view: Cockpit;
  horizon: TreasuryHorizon;
  names: Map<string, string>;
  actions: ReactNode;
  brief: ReactNode;
  suggestions: string[];
}) {
  const below = view.watch.find((w) => w.kind === "below_reserve");
  const noProof = view.watch.find((w) => w.kind === "no_proof");
  const lateIn = view.incoming.lateCents;
  const top = view.budgets[0];
  const topShare = top?.envelopeCents
    ? top.engagedCents / top.envelopeCents
    : 0;
  const nameOf = (id: string) => names.get(id) ?? "—";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-display-xl">
            {t.hello}
            {firstName && (
              <span className="text-[color:var(--text-tertiary)]">
                {" "}
                {firstName}
              </span>
            )}
          </h1>
          <p className="text-body-md text-[color:var(--text-secondary)]">
            {t.sub}
            {view.watch.length > 0 && t.subWatch(view.watch.length)}
            {t.flow.end}
          </p>
        </div>
        <SegmentedLinks
          label={t.horizon}
          options={TREASURY_HORIZONS.map((days) => ({
            key: String(days),
            href: `${routes.finance}?horizon=${days}`,
            label: t.horizonDays(days),
            current: days === horizon,
          }))}
        />
      </header>

      <section
        aria-label={t.cards}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {brief}

        <SentenceCard
          icon={IconChartBarTrendUp}
          title={t.treasury.title}
          href={routes.financeTreasury}
          foot={t.treasury.open}
          visual={treasury ? <TreasurySpark treasury={treasury} /> : null}
        >
          {treasury ? (
            <>
              {t.treasury.lead}
              <Strong>{amount(treasury.todayCents)}</Strong>
              {t.treasury.middle(horizon)}
              <Strong>{amount(treasury.at(horizon))}</Strong>
              {t.treasury.end}
            </>
          ) : (
            t.treasury.noStatement
          )}
        </SentenceCard>

        <SentenceCard
          icon={IconTriangleWarning}
          title={t.low.title}
          href={routes.financeTreasury}
          foot={t.low.open}
          figure={
            treasury
              ? {
                  text: amount(treasury.low.cents),
                  tone:
                    treasury.reserveCents > 0 &&
                    treasury.low.cents < treasury.reserveCents
                      ? "danger"
                      : undefined,
                }
              : undefined
          }
        >
          {treasury ? (
            <>
              {t.low.lead(horizon)}
              <Strong>{formatDay(treasury.low.day)}</Strong>
              {below?.kind === "below_reserve" ? (
                <>
                  {t.low.below}
                  <Strong>{formatDay(below.day)}</Strong>
                </>
              ) : treasury.reserveCents > 0 ? (
                <>
                  {t.low.held}
                  <Strong>{amount(treasury.reserveCents)}</Strong>
                </>
              ) : null}
              {t.low.end}
            </>
          ) : (
            t.treasury.noStatement
          )}
        </SentenceCard>

        <SentenceCard
          icon={IconFile}
          title={t.incoming.title}
          href={
            lateIn > 0
              ? `${routes.financeIncomes}?vue=retard`
              : routes.financeIncomes
          }
          foot={lateIn > 0 ? t.incoming.openLate : t.incoming.open}
          figure={{ text: amount(view.incoming.cents) }}
        >
          <Strong>{t.incoming.count(view.incoming.count)}</Strong>
          {lateIn > 0 && (
            <>
              {t.flow.of}
              <Strong>{amount(lateIn)}</Strong>
              {t.flow.late}
            </>
          )}
          {t.flow.end}
        </SentenceCard>

        <SentenceCard
          icon={IconMoneyBillCoin}
          title={t.outgoing.title}
          href={spendsHref({ statut: "facture" })}
          foot={t.outgoing.open}
          figure={{ text: amount(view.outgoing.cents) }}
        >
          <Strong>{t.outgoing.count(view.outgoing.count, horizon)}</Strong>
          {view.outgoing.lateCents > 0 && (
            <>
              {t.flow.of}
              <Strong>{amount(view.outgoing.lateCents)}</Strong>
              {t.flow.late}
            </>
          )}
          {t.flow.end}
        </SentenceCard>

        <SentenceCard
          icon={IconPiggyBank}
          title={t.budgets.title}
          href={routes.financeBudgets}
          foot={t.budgets.open}
          visual={<BudgetBars budgets={view.budgets} nameOf={nameOf} />}
        >
          {top ? (
            <>
              <Strong>
                {t.budgets.top(nameOf(top.id), percent(topShare))}
              </Strong>
              {t.budgets.rest(
                amount(view.availableCents),
                view.activeEnvelopes,
              )}
            </>
          ) : (
            t.budgets.none
          )}
        </SentenceCard>

        <SentenceCard
          icon={IconPaperclip}
          title={t.proof.title}
          href={routes.financeReceipts}
          foot={t.proof.open}
        >
          {noProof?.kind === "no_proof" ? (
            <>
              <Strong>{t.proof.missing(noProof.count)}</Strong>
              {t.proof.missingEnd}
            </>
          ) : (
            t.proof.done
          )}
        </SentenceCard>

        <SentenceCard
          icon={IconTriangleWarning}
          title={t.watch.title}
          href={routes.financeAlerts}
          foot={t.watch.open}
        >
          {view.watch.length ? (
            <>
              <Strong>{t.watch.count(view.watch.length)}</Strong>
              {t.watch.end}
            </>
          ) : (
            t.watch.none
          )}
        </SentenceCard>
      </section>

      <div
        role="group"
        aria-label={t.actions}
        className="flex flex-wrap justify-center gap-2"
      >
        {actions}
      </div>

      <FinanceAsk suggestions={suggestions} />
    </div>
  );
}

/** One bar per envelope watched, filled to what it has used: ink, amber
 * past the alert share, red past its whole. */
function BudgetBars({
  budgets,
  nameOf,
}: {
  budgets: Cockpit["budgets"];
  nameOf: (id: string) => string;
}) {
  const rows = budgets.filter((b) => b.envelopeCents);
  if (!rows.length) return null;
  return (
    <span className="flex h-[72px] items-end gap-2.5" aria-hidden>
      {rows.map((row) => {
        const share = row.engagedCents / (row.envelopeCents ?? 1);
        return (
          <span
            key={row.id}
            title={t.budgets.bar(nameOf(row.id), percent(share))}
            className="flex h-full flex-1 items-end rounded-xs bg-[var(--surface-soft)]"
          >
            <span
              className={cn(
                "block w-full rounded-xs",
                share >= 1
                  ? "bg-[var(--error)]"
                  : share >= BUDGET_ALERT_SHARE
                    ? "bg-[var(--tone-warning-fg)]"
                    : "bg-[var(--text-primary)]",
              )}
              style={{ height: `${Math.max(6, Math.min(100, share * 100))}%` }}
            />
          </span>
        );
      })}
    </span>
  );
}
