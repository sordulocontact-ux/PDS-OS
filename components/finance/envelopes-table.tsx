import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { routes } from "@/lib/auth/redirects";
import { ENVELOPE_SLUG } from "@/lib/finance/envelope-slugs";
import type { EnvelopeRow } from "@/lib/finance/envelopes";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { formatAmount } from "@/lib/utils/money";

const fr = { financeBudgets };

const amount = (cents: number) => formatAmount(cents, { ht: false });

/** A signed gap: « +200 € » over the forecast, « −50 € » under it. */
export function SignedGap({ cents }: { cents: number }) {
  if (cents === 0) return <>{amount(0)}</>;
  return (
    <span
      className={
        cents > 0
          ? "text-[color:var(--tone-warning-fg)]"
          : "text-[color:var(--tone-success-fg)]"
      }
    >
      {fr.financeBudgets.signed(amount(Math.abs(cents)), cents > 0)}
    </span>
  );
}

/**
 * Every envelope with the ticket's figures (« budget initial, révisions,
 * prévu, engagé, facturé, payé, reste disponible, refacturable, écart au
 * prévisionnel »), HT, one row each, opening its detail.
 */
export function EnvelopesTable({ rows }: { rows: EnvelopeRow[] }) {
  const t = fr.financeBudgets;
  const c = t.columns;
  return (
    <DataTable framed>
      <DataTableHeader>
        <DataTableHead fill>{c.envelope}</DataTableHead>
        <DataTableHead align="end" hideBelow="sm">
          {c.budget}
        </DataTableHead>
        <DataTableHead align="end" hideBelow="lg">
          {c.planned}
        </DataTableHead>
        <DataTableHead align="end">{c.engaged}</DataTableHead>
        <DataTableHead align="end" hideBelow="xl">
          {c.invoiced}
        </DataTableHead>
        <DataTableHead align="end" hideBelow="xl">
          {c.paid}
        </DataTableHead>
        <DataTableHead align="end" hideBelow="md">
          {c.rest}
        </DataTableHead>
        <DataTableHead align="end" hideBelow="xl">
          {c.rebillable}
        </DataTableHead>
        <DataTableHead align="end" hideBelow="lg">
          {c.gap}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((row) => (
          <DataTableRow key={`${row.kind}:${row.id}`}>
            <DataTableCell fill>
              <DataTableMedia
                title={
                  <DataTableLink
                    href={routes.financeBudget(ENVELOPE_SLUG[row.kind], row.id)}
                  >
                    {row.name}
                  </DataTableLink>
                }
                subtitle={t.kindOne[row.kind]}
              />
            </DataTableCell>
            <DataTableCell align="end" hideBelow="sm" className="tabular-nums">
              {row.currentCents === null ? (
                <span className="text-[color:var(--text-secondary)]">
                  {t.noBudget}
                </span>
              ) : (
                <span className="grid justify-items-end">
                  <span>{amount(row.currentCents)}</span>
                  {row.revisionsCents !== 0 && row.initialCents !== null && (
                    <span className="text-caption text-[color:var(--text-secondary)]">
                      {t.initial(amount(row.initialCents))}
                    </span>
                  )}
                </span>
              )}
            </DataTableCell>
            <DataTableCell align="end" hideBelow="lg" className="tabular-nums">
              {amount(row.totals.plannedCents)}
            </DataTableCell>
            <DataTableCell align="end" className="tabular-nums">
              {amount(row.engagedCents)}
            </DataTableCell>
            <DataTableCell align="end" hideBelow="xl" className="tabular-nums">
              {amount(row.totals.invoicedCents)}
            </DataTableCell>
            <DataTableCell align="end" hideBelow="xl" className="tabular-nums">
              {amount(row.totals.paidCents)}
            </DataTableCell>
            <DataTableCell align="end" hideBelow="md" className="tabular-nums">
              {row.restCents === null ? (
                EMPTY_CELL
              ) : row.restCents < 0 ? (
                <span className="text-[color:var(--error)]">
                  {t.over(amount(-row.restCents))}
                </span>
              ) : (
                amount(row.restCents)
              )}
            </DataTableCell>
            <DataTableCell align="end" hideBelow="xl" className="tabular-nums">
              {row.totals.rebillableCents
                ? amount(row.totals.rebillableCents)
                : EMPTY_CELL}
            </DataTableCell>
            <DataTableCell align="end" hideBelow="lg" className="tabular-nums">
              <SignedGap cents={row.gapCents} />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
