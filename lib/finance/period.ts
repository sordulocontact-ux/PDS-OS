// The period the Finance page reads (?periode=…): this month, this quarter,
// this year (the default) or everything; with the period before it, to say
// how the spending moved. Days are calendar days (« AAAA-MM-JJ »), today in
// Paris given by the caller. Client-safe, pure code.

export const FINANCE_PERIODS = ["mois", "trimestre", "annee", "tout"] as const;
export type FinancePeriodKey = (typeof FINANCE_PERIODS)[number];

export const DEFAULT_FINANCE_PERIOD: FinancePeriodKey = "annee";

/** A month, « AAAA-MM ». */
export type Month = string;

export type FinancePeriod = {
  key: FinancePeriodKey;
  // First and last month of the period, null for « Tout ».
  from: Month | null;
  to: Month | null;
  // The same length just before, null for « Tout ».
  previous: { from: Month; to: Month } | null;
};

export function asFinancePeriod(value: unknown): FinancePeriodKey {
  return typeof value === "string" &&
    (FINANCE_PERIODS as readonly string[]).includes(value)
    ? (value as FinancePeriodKey)
    : DEFAULT_FINANCE_PERIOD;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** « 2026-11 » moved by a number of months. */
export function addMonths(month: Month, count: number): Month {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + count;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** Every month from one to another, both included. */
export function monthsBetween(from: Month, to: Month): Month[] {
  const months: Month[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) months.push(m);
  return months;
}

export function financePeriod(
  key: FinancePeriodKey,
  today: string,
): FinancePeriod {
  const month = today.slice(0, 7);
  const [year, m] = month.split("-").map(Number);
  const span = (from: Month, length: number): FinancePeriod => ({
    key,
    from,
    to: addMonths(from, length - 1),
    previous: {
      from: addMonths(from, -length),
      to: addMonths(from, -1),
    },
  });
  if (key === "mois") return span(month, 1);
  if (key === "trimestre")
    return span(`${year}-${pad(Math.floor((m - 1) / 3) * 3 + 1)}`, 3);
  if (key === "annee") return span(`${year}-01`, 12);
  return { key, from: null, to: null, previous: null };
}

/** Whether a month is in a span (no span: every month). */
export function inSpan(
  month: Month,
  span: { from: Month | null; to: Month | null } | null,
): boolean {
  if (!span) return false;
  return (
    (span.from === null || month >= span.from) &&
    (span.to === null || month <= span.to)
  );
}

// At most three years of bars: beyond, the chart says nothing more.
const MAX_CHART_MONTHS = 36;

/**
 * The months the chart draws: the year for « Cette année » (its last months
 * show what is already planned), the twelve months up to the period's end
 * for a month or a quarter (what came before), every month with a spend up
 * to now for « Tout » (three years at most).
 */
export function chartMonths(
  period: FinancePeriod,
  today: string,
  dataMonths: Month[],
): Month[] {
  const current = today.slice(0, 7);
  if (period.key === "annee" && period.from && period.to)
    return monthsBetween(period.from, period.to);
  if (period.to) return monthsBetween(addMonths(period.to, -11), period.to);
  const last = [current, ...dataMonths].sort().at(-1) ?? current;
  const first = [current, ...dataMonths].sort()[0] ?? current;
  const floor = addMonths(last, -(MAX_CHART_MONTHS - 1));
  return monthsBetween(first < floor ? floor : first, last);
}
