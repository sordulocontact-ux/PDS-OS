import { AddPartButton } from "@/components/finance/budget-part-actions";
import type { PartCandidate } from "@/components/finance/budget-part-forms";
import { PartRow } from "@/components/finance/budget-part-row";
import { EmptyNote } from "@/components/shell/empty-state";
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
import {
  namedLike,
  splitBudget,
  type BudgetPart,
} from "@/lib/finance/budget-envelope";
import type { EnvelopeKind } from "@/lib/finance/envelopes";
import type { FinanceSpend } from "@/lib/finance/spends";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { formatAmount } from "@/lib/utils/money";

const fr = { financeBudgets };

const amount = (cents: number) => formatAmount(cents, { ht: false });

/**
 * A budget cut into sub-budgets (retour d'Ibé du 18/11/2026): each with its
 * amount, what is planned, what it spent (committed, invoiced and paid, as
 * the budget) and what is left, then what no sub-budget holds. Always there
 * for the Finance, with « Découper ce budget » while it is not cut (UX test
 * of 23/11/2026); a reader sees it only once cut.
 */
export function BudgetParts({
  kind,
  id,
  budgetCents,
  parts,
  partOf,
  spends,
  canManage,
}: {
  kind: EnvelopeKind;
  id: string;
  budgetCents: number | null;
  parts: BudgetPart[];
  partOf: Record<string, string>;
  // Every spend of the budget, whatever the status filter of the page.
  spends: FinanceSpend[];
  canManage: boolean;
}) {
  const t = fr.financeBudgets;
  if (parts.length === 0 && !canManage) return null;
  const head = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-body-lg font-medium">{t.parts.title}</h3>
      {canManage && parts.length > 0 && (
        <AddPartButton kind={kind} targetId={id} />
      )}
    </div>
  );
  if (parts.length === 0)
    return (
      <section className="flex flex-col gap-3">
        {head}
        <EmptyNote action={<AddPartButton kind={kind} targetId={id} first />}>
          {t.parts.none}
        </EmptyNote>
      </section>
    );

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
  const looseLeft = loose === null ? null : loose - summary.looseSpentCents;
  return (
    <section className="flex flex-col gap-3">
      {head}
      <DataTable framed>
        <DataTableHeader>
          <DataTableHead fill>{t.parts.part}</DataTableHead>
          <DataTableHead align="end" hideBelow="sm">
            {t.parts.amount}
          </DataTableHead>
          <DataTableHead align="end" hideBelow="lg">
            {t.parts.planned}
          </DataTableHead>
          <DataTableHead align="end" hideBelow="md">
            {t.parts.spent}
          </DataTableHead>
          <DataTableHead align="end">{t.parts.rest}</DataTableHead>
          <DataTableHead hideBelow="md" className="w-[18%]">
            {t.columns.consumed}
          </DataTableHead>
          {canManage && (
            <DataTableActionsHead label={t.actions.more} className="w-auto" />
          )}
        </DataTableHeader>
        <DataTableBody>
          {summary.rows.map((row) => (
            <PartRow
              key={row.id}
              kind={kind}
              targetId={id}
              part={row}
              candidates={candidates(row)}
              canManage={canManage}
            />
          ))}
          {((loose !== null && loose !== 0) || summary.looseLines > 0) && (
            <DataTableRow pinned>
              <DataTableCell fill>
                <span className="truncate text-[color:var(--text-secondary)]">
                  {t.parts.outside}
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
                hideBelow="lg"
                className="tabular-nums"
              >
                {amount(summary.loosePlannedCents)}
              </DataTableCell>
              <DataTableCell
                align="end"
                hideBelow="md"
                className="tabular-nums"
              >
                {amount(summary.looseSpentCents)}
              </DataTableCell>
              <DataTableCell align="end">
                {/* Red only when the sub-budgets exceed the budget; spends
                    filed in no part are to file, not an overrun. */}
                {loose !== null && loose < 0 ? (
                  <RestAmount cents={loose} bare />
                ) : summary.looseLines > 0 &&
                  (looseLeft === null || looseLeft < 0) ? (
                  <span className="whitespace-nowrap text-[color:var(--text-secondary)]">
                    {t.parts.toFile(summary.looseLines)}
                  </span>
                ) : (
                  looseLeft !== null && <RestAmount cents={looseLeft} bare />
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
