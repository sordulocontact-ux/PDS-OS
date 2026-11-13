import type { MonthBar } from "@/lib/finance/aggregate";
import type { Month } from "@/lib/finance/period";
import { finance } from "@/lib/i18n/fr/finance";
import { formatAmount } from "@/lib/utils/money";

const fr = { finance };

type Series = readonly {
  key: "paidCents" | "unpaidCents" | "estimatedCents";
  label: "paid" | "unpaid" | "estimated";
}[];

/** The figures of « Dépenses par mois » as a table, for screen readers. */
export function MonthChartTable({
  bars,
  series,
  monthName,
}: {
  bars: MonthBar[];
  series: Series;
  monthName: (month: Month, style: "long") => string;
}) {
  return (
    <table className="sr-only">
      <caption>{fr.finance.chart.tableCaption}</caption>
      <thead>
        <tr>
          <th scope="col">{fr.finance.chart.month}</th>
          {series.map((s) => (
            <th key={s.key} scope="col">
              {fr.finance.chart[s.label]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {bars.map((bar) => (
          <tr key={bar.month}>
            <th scope="row">{monthName(bar.month, "long")}</th>
            {series.map((s) => (
              <td key={s.key}>{formatAmount(bar[s.key])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
