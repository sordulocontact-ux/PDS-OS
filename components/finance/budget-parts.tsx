import {
  AddPartButton,
  PartMenu,
} from "@/components/finance/budget-part-actions";
import type { PartCandidate } from "@/components/finance/budget-part-forms";
import { ConsumptionMeter } from "@/components/finance/consumption-meter";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { RestAmount } from "@/components/ui/rest-amount";
import { namedLike, splitBudget } from "@/lib/finance/budget-envelope";
import { loadBudgetParts } from "@/lib/finance/budget-envelope-queries";
import type { EnvelopeKind } from "@/lib/finance/envelopes";
import type { FinanceSpend } from "@/lib/finance/spends";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { formatAmount } from "@/lib/utils/money";

const fr = { financeBudgets };

const amount = (cents: number) => formatAmount(cents, { ht: false });

/**
 * A budget cut into sub-budgets (retour d'Ibé du 18/11/2026): each with its
 * amount, what it spent (committed, invoiced and paid, as the budget) and
 * what is left, then what no sub-budget holds (the budget less the parts,
 * and what the spends outside every part spent). Nothing when the budget is
 * not cut; the Finance cuts it from « ⋯ ». Spends join a sub-budget from its
 * own « ⋯ », its sub-post naming it pre-ticks them.
 */
export async function BudgetParts({
  kind,
  id,
  budgetCents,
  spends,
  canManage,
}: {
  kind: EnvelopeKind;
  id: string;
  budgetCents: number | null;
  // Every spend of the budget, whatever the status filter of the page.
  spends: FinanceSpend[];
  canManage: boolean;
}) {
  const t = fr.financeBudgets;
  const { parts, partOf } = await loadBudgetParts(kind, id);
  if (parts.length === 0) return null;
  const summary = splitBudget(parts, spends, partOf, budgetCents);
  const partName = new Map(parts.map((p) => [p.id, p.name]));
  const candidates = (part: { name: string }): PartCandidate[] =>
    spends
      .filter((s) => !s.refused)
      .map((s) => ({
        id: s.id,
        label: s.label,
        cents: s.cents,
        partId: partOf[s.id] ?? null,
        partName: partName.get(partOf[s.id] ?? "") ?? null,
        suggested: namedLike(part, s),
      }));
  const loose = summary.unallocatedCents;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-body-lg font-medium">{t.parts.title}</h3>
        {canManage && <AddPartButton kind={kind} targetId={id} />}
      </div>
      <DataTable framed>
        <DataTableHeader>
          <DataTableHead fill>{t.parts.part}</DataTableHead>
          <DataTableHead align="end" hideBelow="sm">
            {t.parts.amount}
          </DataTableHead>
          <DataTableHead align="end" hideBelow="md">
            {t.parts.spent}
          </DataTableHead>
          <DataTableHead align="end">{t.parts.rest}</DataTableHead>
          <DataTableHead hideBelow="md" className="w-[22%]">
            {t.columns.consumed}
          </DataTableHead>
          {canManage && <DataTableActionsHead label={t.actions.more} />}
        </DataTableHeader>
        <DataTableBody>
          {summary.rows.map((row) => {
            const share = row.amountCents
              ? row.spentCents / row.amountCents
              : 0;
            return (
              <DataTableRow key={row.id}>
                <DataTableCell fill>
                  <span className="truncate font-medium">{row.name}</span>
                </DataTableCell>
                <DataTableCell
                  align="end"
                  hideBelow="sm"
                  className="tabular-nums"
                >
                  {amount(row.amountCents)}
                </DataTableCell>
                <DataTableCell
                  align="end"
                  hideBelow="md"
                  className="tabular-nums"
                >
                  {amount(row.spentCents)}
                </DataTableCell>
                <DataTableCell align="end">
                  <RestAmount cents={row.restCents} bare />
                </DataTableCell>
                <DataTableCell hideBelow="md">
                  <ConsumptionMeter
                    share={share}
                    label={t.figures.used(row.name, Math.round(share * 100))}
                  />
                </DataTableCell>
                {canManage && (
                  <DataTableActionsCell>
                    <PartMenu
                      kind={kind}
                      targetId={id}
                      part={row}
                      candidates={candidates(row)}
                    />
                  </DataTableActionsCell>
                )}
              </DataTableRow>
            );
          })}
          {(loose !== null || summary.looseLines > 0) && (
            <DataTableRow>
              <DataTableCell fill>
                <span className="truncate text-[color:var(--text-secondary)]">
                  {t.parts.unallocated}
                </span>
              </DataTableCell>
              <DataTableCell
                align="end"
                hideBelow="sm"
                className="tabular-nums"
              >
                {loose === null ? "" : amount(Math.max(loose, 0))}
              </DataTableCell>
              <DataTableCell
                align="end"
                hideBelow="md"
                className="tabular-nums"
              >
                {amount(summary.looseSpentCents)}
              </DataTableCell>
              <DataTableCell align="end">
                {loose !== null && (
                  <RestAmount cents={loose - summary.looseSpentCents} bare />
                )}
              </DataTableCell>
              <DataTableCell hideBelow="md">{null}</DataTableCell>
              {canManage && <DataTableActionsCell>{null}</DataTableActionsCell>}
            </DataTableRow>
          )}
        </DataTableBody>
      </DataTable>
    </section>
  );
}
