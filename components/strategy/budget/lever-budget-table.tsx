import { StrategyPart } from "@/components/strategy/strategy-part";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { formatEuros } from "@/lib/budget/types";
import { strategyBudget } from "@/lib/i18n/fr/strategy-budget";
import type { LeverBudget } from "@/lib/strategy/budget";

const fr = { strategyBudget };

/**
 * Répartition par levier: each selected lever, even without budget, then
 * lines on other levers and those outside any lever. Amounts by code.
 */
export function LeverBudgetTable({ rows }: { rows: LeverBudget[] }) {
  const t = fr.strategyBudget.byLever;
  return (
    <StrategyPart id="lever-budget-title" title={t.title}>
      {rows.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{t.empty}</p>
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableHead fill>{t.lever}</DataTableHead>
            <DataTableHead align="end" hideBelow="sm">
              {t.proposed}
            </DataTableHead>
            <DataTableHead align="end">{t.validated}</DataTableHead>
            <DataTableHead align="end">{t.toDecide}</DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {rows.map((row) => (
              <DataTableRow key={row.leverId ?? "none"}>
                <DataTableCell fill className="break-words">
                  {row.label}
                </DataTableCell>
                <DataTableCell
                  align="end"
                  hideBelow="sm"
                  className="tabular-nums"
                >
                  {formatEuros(row.proposedCents)}
                </DataTableCell>
                <DataTableCell align="end" className="tabular-nums">
                  {formatEuros(row.validatedCents)}
                </DataTableCell>
                <DataTableCell align="end" className="tabular-nums">
                  {formatEuros(row.toDecideCents)}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </StrategyPart>
  );
}
