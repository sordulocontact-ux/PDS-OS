import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { BudgetRow } from "@/lib/finance/aggregate";
import { finance } from "@/lib/i18n/fr/finance";
import { envelopeTone } from "@/lib/ui/state-tones";
import { formatAmount } from "@/lib/utils/money";

const fr = { finance };

export type EnvelopeTableRow = BudgetRow & {
  title: string;
  subtitle?: string;
  // Its Budget, for whoever reads it there; plain text otherwise.
  href: string | null;
};

/**
 * Envelope against engaged, one row per project or artist (Finance): the
 * share of the envelope engaged as a bar, an overrun said in words on a
 * danger badge, what is only estimated under the engaged amount. Without an
 * envelope, the engaged amount alone. Sorted by the caller (the riskiest
 * first, lib/finance/aggregate.ts).
 */
export function EnvelopeTable({
  rows,
  nameLabel,
}: {
  rows: EnvelopeTableRow[];
  nameLabel: string;
}) {
  const t = fr.finance.budget;
  return (
    <DataTable framed>
      <DataTableHeader>
        <DataTableHead fill>{nameLabel}</DataTableHead>
        <DataTableHead align="end" hideBelow="sm">
          {t.envelope}
        </DataTableHead>
        <DataTableHead align="end">{t.engaged}</DataTableHead>
        <DataTableHead align="end" hideBelow="md">
          {t.rest}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((row) => {
          const over = row.restCents !== null && row.restCents < 0;
          const percent = row.envelopeCents
            ? Math.round((row.engagedCents / row.envelopeCents) * 100)
            : null;
          return (
            <DataTableRow key={row.id}>
              <DataTableCell fill>
                <DataTableMedia
                  title={
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <DataTableLink href={row.href}>{row.title}</DataTableLink>
                      {over && row.restCents !== null && (
                        <StatusBadge tone={envelopeTone.over} size="sm">
                          {t.over(formatAmount(-row.restCents, { ht: false }))}
                        </StatusBadge>
                      )}
                    </span>
                  }
                  subtitle={row.subtitle}
                />
              </DataTableCell>
              <DataTableCell
                align="end"
                hideBelow="sm"
                className="tabular-nums"
              >
                {row.envelopeCents === null ? (
                  <span className="text-[color:var(--text-tertiary)]">
                    {t.noEnvelope}
                  </span>
                ) : (
                  formatAmount(row.envelopeCents, { ht: false })
                )}
              </DataTableCell>
              <DataTableCell align="end" className="w-40 tabular-nums">
                <span className="flex flex-col items-end gap-1.5">
                  {formatAmount(row.engagedCents, { ht: false })}
                  {row.envelopeCents !== null && percent !== null && (
                    <ProgressBar
                      value={row.engagedCents}
                      max={row.envelopeCents}
                      label={t.progress(percent)}
                      tone={over ? "error" : "ink"}
                    />
                  )}
                  {row.estimatedCents > 0 && (
                    <span className="text-caption font-normal text-[color:var(--text-tertiary)]">
                      {t.estimated(
                        formatAmount(row.estimatedCents, { ht: false }),
                      )}
                    </span>
                  )}
                </span>
              </DataTableCell>
              <DataTableCell
                align="end"
                hideBelow="md"
                className="tabular-nums"
              >
                {row.restCents === null
                  ? "—"
                  : formatAmount(row.restCents, { ht: false })}
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
