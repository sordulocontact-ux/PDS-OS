import { EmptyNote } from "@/components/shell/empty-state";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatTiles } from "@/components/ui/stat-tiles";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import type { PreprodBudgetTotals } from "@/lib/production/preprod/budget";
import type {
  Equipment,
  PreprodBudgetLine,
} from "@/lib/production/preprod/types";
import { preprodBudgetTone } from "@/lib/ui/state-tones";

import { AddBudgetLineButton, BudgetLineMenu } from "./budget-line-form";

const t = fr.productionPreprod.budget;

/**
 * The preproduction budget: envelope, estimated, remainder (totalled by
 * code), a warning when the estimate exceeds the envelope — an
 * arbitration to ask for, nothing blocked — then the lines.
 */
export function BudgetBlock({
  projectId,
  sheetId,
  lines,
  totals,
  equipment,
  canOrganize,
}: {
  projectId: string;
  sheetId: string;
  lines: PreprodBudgetLine[];
  totals: PreprodBudgetTotals;
  equipment: Equipment[];
  canOrganize: boolean;
}) {
  const props = {
    projectId,
    sheetId,
    equipment: equipment.map((e) => ({ id: e.id, label: e.label })),
  };
  return (
    <section aria-labelledby="preprod-budget" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="preprod-budget" className="text-base font-semibold">
          {t.title}
        </h3>
        {canOrganize && <AddBudgetLineButton {...props} />}
      </div>
      <StatTiles
        stats={[
          {
            label: t.tiles.envelope,
            value:
              totals.envelopeCents === null
                ? t.noEnvelope
                : formatEuros(totals.envelopeCents),
          },
          {
            label: t.tiles.estimated,
            value: formatEuros(totals.estimatedCents),
          },
          {
            label: t.tiles.remaining,
            value:
              totals.remainingCents === null
                ? EMPTY_CELL
                : formatEuros(totals.remainingCents),
          },
          {
            label: t.tiles.toEstimate,
            value: String(totals.byStatus.to_estimate.count),
          },
        ]}
      />
      {totals.over && totals.envelopeCents !== null && (
        <ToneCallout tone="warning">
          {t.over(formatEuros(totals.envelopeCents))}
        </ToneCallout>
      )}
      {lines.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableHead fill>{t.columns.line}</DataTableHead>
            <DataTableHead hideBelow="sm" align="end">
              {t.columns.amount}
            </DataTableHead>
            <DataTableHead align="end">{t.columns.status}</DataTableHead>
            {canOrganize && <DataTableActionsHead label={t.columns.actions} />}
          </DataTableHeader>
          <DataTableBody>
            {lines.map((line) => (
              <DataTableRow key={line.id}>
                <DataTableCell fill className="max-w-0">
                  <DataTableMedia
                    title={line.label}
                    subtitle={[t.categories[line.category], line.note]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                </DataTableCell>
                <DataTableCell
                  hideBelow="sm"
                  align="end"
                  className="tabular-nums"
                >
                  {line.amountCents === null
                    ? EMPTY_CELL
                    : formatEuros(line.amountCents)}
                </DataTableCell>
                <DataTableCell align="end">
                  <StatusBadge tone={preprodBudgetTone[line.status]} size="sm">
                    {t.statuses[line.status]}
                  </StatusBadge>
                </DataTableCell>
                {canOrganize && (
                  <DataTableActionsCell>
                    <BudgetLineMenu {...props} line={line} />
                  </DataTableActionsCell>
                )}
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </section>
  );
}
