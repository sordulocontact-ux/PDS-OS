import {
  ConsumptionMeter,
  consumedTone,
} from "@/components/finance/consumption-meter";
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
import { RestAmount } from "@/components/ui/rest-amount";
import { routes } from "@/lib/auth/redirects";
import { ENVELOPE_SLUG } from "@/lib/finance/envelope-slugs";
import type { EnvelopeRow } from "@/lib/finance/envelopes";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/utils/day";
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
 * Every budget as the proto's Budgets list: its name (with its period, or
 * « Révisé : avant → après » once revised), its type, its amount, what is
 * spent (committed + invoiced + paid), what is left (red once over) and the
 * share used with its gauge. Each row opens the envelope's page, which carries every other
 * figure of the ticket (initial budget, revisions, planned, invoiced, paid,
 * rebillable, gap, PDS share: `EnvelopeFigures`).
 */
export function EnvelopesTable({ rows }: { rows: EnvelopeRow[] }) {
  const t = fr.financeBudgets;
  const c = t.columns;
  return (
    <DataTable framed>
      <DataTableHeader>
        <DataTableHead icon="item" fill>
          {c.envelope}
        </DataTableHead>
        <DataTableHead icon="kind" hideBelow="lg">
          {c.type}
        </DataTableHead>
        <DataTableHead icon="amount" align="end" hideBelow="md">
          {c.budget}
        </DataTableHead>
        <DataTableHead icon="amount" align="end" hideBelow="md">
          {c.used}
        </DataTableHead>
        {/* On a phone, what is left is what reads: « Reste ». */}
        <DataTableHead icon="amount" align="end">
          {c.rest}
        </DataTableHead>
        <DataTableHead icon="ongoing" hideBelow="md" className="w-[22%]">
          {c.consumed}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((row) => {
          const budget = row.currentCents;
          const share = budget ? row.engagedCents / budget : 0;
          const percent = Math.round(share * 100);
          const tone = consumedTone(share);
          const subtitle = row.period
            ? t.detail.period(
                formatDay(row.period.startsOn, { weekday: false }),
                row.period.endsOn
                  ? formatDay(row.period.endsOn, { weekday: false })
                  : null,
              )
            : row.revisionsCents !== 0 &&
                row.initialCents !== null &&
                row.currentCents !== null
              ? t.revised(amount(row.initialCents), amount(row.currentCents))
              : undefined;
          return (
            <DataTableRow key={`${row.kind}:${row.id}`}>
              <DataTableCell fill>
                <DataTableMedia
                  title={
                    <DataTableLink
                      href={routes.financeBudget(
                        ENVELOPE_SLUG[row.kind],
                        row.id,
                      )}
                    >
                      {row.name}
                    </DataTableLink>
                  }
                  subtitle={subtitle}
                />
              </DataTableCell>
              <DataTableCell
                hideBelow="lg"
                className="text-[color:var(--text-secondary)]"
              >
                {t.kindOne[row.kind]}
              </DataTableCell>
              <DataTableCell
                align="end"
                hideBelow="md"
                className="tabular-nums"
              >
                {budget === null ? (
                  <span className="text-[color:var(--text-secondary)]">
                    {t.noBudget}
                  </span>
                ) : (
                  amount(budget)
                )}
              </DataTableCell>
              <DataTableCell
                align="end"
                hideBelow="md"
                className="tabular-nums"
              >
                {amount(row.engagedCents)}
              </DataTableCell>
              <DataTableCell align="end">
                {row.restCents === null ? (
                  EMPTY_CELL
                ) : (
                  <RestAmount cents={row.restCents} bare />
                )}
              </DataTableCell>
              <DataTableCell hideBelow="md">
                {budget === null ? (
                  EMPTY_CELL
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span
                      className={cn(
                        "tabular-nums",
                        tone === "error" && "text-[color:var(--error)]",
                        tone === "warning" &&
                          "text-[color:var(--tone-warning-fg)]",
                        tone === "ink" && "text-[color:var(--text-secondary)]",
                      )}
                    >
                      {t.percent(percent)}
                    </span>
                    <ConsumptionMeter
                      share={share}
                      label={t.figures.used(row.name, percent)}
                    />
                  </div>
                )}
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
