import { FormMessage } from "@/components/auth/form-message";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { PlanningBoard } from "@/components/finance/planning/planning-board";
import { PlanningTotals } from "@/components/finance/planning/planning-totals";
import { CalendarToolbar, periodLabel } from "@/components/ui/calendar-toolbar";
import { ToneCallout } from "@/components/ui/tone-callout";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { asMonth, planningDays } from "@/lib/finance/planning";
import { addDays, computeTreasury } from "@/lib/finance/treasury";
import { loadSpends } from "@/lib/finance/spend-queries";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { financePlanning as t } from "@/lib/i18n/fr/finance-planning";
import { treasury as treasuryText } from "@/lib/i18n/fr/treasury";
import { daysBetween, parisPlace, periodOf } from "@/lib/utils/calendar-period";
import { formatDay } from "@/lib/utils/day";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

// The forecast reads at least as far as Trésorerie's default (its low point
// is the same), up to the end of the grid shown, never past six months.
const MIN_DAYS = 90;
const MAX_DAYS = 180;

const monthHref = (date: string | null) =>
  date
    ? `${routes.financePlanning}?mois=${date.slice(0, 7)}`
    : routes.financePlanning;

/**
 * Finance › Planning (Sacha 15/11/2026: « un vrai planning, un vrai
 * calendrier », as Midday): the month (?mois=YYYY-MM) as a grid, each day
 * with its moves, the balance at its end when it moves, the day the
 * balance goes under the reserve and the forecast's low point. Past days
 * show the real (receipts, spends paid), today and after the forecast,
 * everything read from `computeTreasury`. A day opens in the side sheet, and
 * so does each of its moves' records, without leaving the page.
 */
export default async function FinancePlanningPage({
  searchParams,
}: PageProps<"/app/finance/planning">) {
  const today = parisPlace(new Date()).day;
  const [access, params] = await allInOrder([
    requirePermission("read_finance"),
    searchParams,
  ]);
  const month = asMonth(params.mois) ?? today.slice(0, 7);
  const period = periodOf("month", `${month}-01`);
  const gridEnd = period.days[period.days.length - 1];
  const horizon = Math.min(
    Math.max(daysBetween(today, gridEnd), MIN_DAYS),
    MAX_DAYS,
  );
  const until = addDays(today, horizon);
  const [data, spends] = await allInOrder([loadTreasury(until), loadSpends()]);
  const treasury = computeTreasury({ ...data, today, horizon });
  const days = planningDays({
    month,
    today,
    treasury,
    incomes: data.incomes,
    paid: data.paid,
    engines: data.engines,
  });
  const lastDay = days[days.length - 1].day;

  return (
    <FinanceFrame section="planning">
      {(data.error || spends.error) && (
        <FormMessage kind="error">{treasuryText.loadError}</FormMessage>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CalendarToolbar
          period={period}
          hrefOf={(_, date) => monthHref(date)}
          modes={false}
        />
        <PlanningTotals days={days} />
      </div>
      {!treasury ? (
        <ToneCallout tone="info">{t.noStatement}</ToneCallout>
      ) : (
        lastDay > until && (
          <ToneCallout tone="neutral">
            {t.beyond(formatDay(until, { weekday: false }))}
          </ToneCallout>
        )
      )}
      <PlanningBoard
        monthName={periodLabel(period)}
        cells={period.days}
        days={days}
        today={today}
        data={{
          spends: spends.spends,
          incomes: data.incomes,
          targets: data.targets,
          today,
          proofIn:
            can(access, "manage_finance") && access.organizationId
              ? access.organizationId
              : undefined,
        }}
      />
    </FinanceFrame>
  );
}
