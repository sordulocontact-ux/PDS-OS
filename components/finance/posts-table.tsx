import { SignedGap } from "@/components/finance/envelopes-table";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { engagedOf, type PostRow } from "@/lib/finance/envelopes";
import { budget } from "@/lib/i18n/fr/budget";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { formatAmount } from "@/lib/utils/money";

const fr = { budget, financeBudgets };

const amount = (cents: number) => formatAmount(cents, { ht: false });

/**
 * An envelope by poste then sub-post (Ibé's ticket, maquette 3): what was
 * forecast, what the lines cost now, what is engaged and paid, the gap to
 * the forecast. HT.
 */
export function PostsTable({ posts }: { posts: PostRow[] }) {
  const t = fr.financeBudgets.detail;
  const row = (
    key: string,
    label: string,
    totals: PostRow["totals"],
    sub: boolean,
  ) => (
    <DataTableRow key={key}>
      <DataTableCell fill>
        <span
          className={
            sub
              ? "truncate pl-4 text-[color:var(--text-secondary)]"
              : "truncate font-medium"
          }
        >
          {label}
        </span>
      </DataTableCell>
      <DataTableCell align="end" hideBelow="sm" className="tabular-nums">
        {amount(totals.forecastCents)}
      </DataTableCell>
      <DataTableCell align="end" className="tabular-nums">
        {amount(totals.projectedCents)}
      </DataTableCell>
      <DataTableCell align="end" hideBelow="md" className="tabular-nums">
        {amount(engagedOf(totals))} · {amount(totals.paidCents)}
      </DataTableCell>
      <DataTableCell align="end" hideBelow="sm" className="tabular-nums">
        <SignedGap cents={totals.projectedCents - totals.forecastCents} />
      </DataTableCell>
    </DataTableRow>
  );
  return (
    <DataTable framed>
      <DataTableHeader>
        <DataTableHead fill>{t.post}</DataTableHead>
        <DataTableHead align="end" hideBelow="sm">
          {t.forecast}
        </DataTableHead>
        <DataTableHead align="end">{t.now}</DataTableHead>
        <DataTableHead align="end" hideBelow="md">
          {t.stage}
        </DataTableHead>
        <DataTableHead align="end" hideBelow="sm">
          {t.gap}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {posts.flatMap((p) => {
          const label = p.family
            ? fr.budget.families[p.family]
            : fr.financeBudgets.pie.none;
          const named = p.subposts.filter((s) => s.name);
          return [
            row(p.family ?? "none", label, p.totals, false),
            ...(named.length
              ? p.subposts.map((s) =>
                  row(
                    `${p.family ?? "none"}:${s.name ?? ""}`,
                    s.name ?? t.noSubpost,
                    s.totals,
                    true,
                  ),
                )
              : []),
          ];
        })}
      </DataTableBody>
    </DataTable>
  );
}
