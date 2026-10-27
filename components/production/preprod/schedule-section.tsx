import { PageSection } from "@/components/shell/page-section";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatEuros } from "@/lib/budget/types";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import type { EffectiveLogistics, Sourced } from "@/lib/production/logistics";
import type {
  ScheduleRow,
  ScheduleWarning,
} from "@/lib/production/preprod/schedule";
import type { SheetLogistics } from "@/lib/production/sheet";
import { formatShortDate } from "@/lib/release/format";
import { scheduleStepTone } from "@/lib/ui/state-tones";

import { ScheduleEditButton } from "./schedule-form";

const fr = { productionPreprod };

const t = fr.productionPreprod.schedule;

/**
 * « Rétroplanning et budget »: the dates in force (Production's, else the
 * Fiche's, a divergence shown), what contradicts, the backward schedule
 * computed by code with its dependencies; the budget follows (`children`).
 */
export function ScheduleSection({
  projectId,
  sheetId,
  own,
  logistics,
  schedule,
  canOrganize,
  ownerName,
  ready,
  children,
}: {
  projectId: string;
  sheetId: string;
  own: SheetLogistics;
  logistics: EffectiveLogistics;
  schedule: { rows: ScheduleRow[]; warnings: ScheduleWarning[] };
  canOrganize: boolean;
  ownerName: string | null;
  ready: boolean;
  children: React.ReactNode;
}) {
  const day = (v: string | null) => (v ? formatShortDate(v) : null);
  const money = (v: number | null) => (v === null ? null : formatEuros(v));
  const fact = <T,>(
    label: string,
    s: Sourced<T>,
    show: (v: T | null) => string | null,
  ) => ({
    label,
    value:
      s.value === null ? null : (
        <span className="flex flex-col">
          <span>{show(s.value)}</span>
          <span className="text-xs text-muted-foreground">
            {s.diverges
              ? `${t.fromProduction} · ${t.diverges(show(s.ficheValue) ?? EMPTY_CELL)}`
              : s.source === "production"
                ? t.fromProduction
                : t.fromFiche}
          </span>
        </span>
      ),
  });
  const stepLabel = (row: ScheduleRow) =>
    row.end && row.date && row.end !== row.date
      ? t.period(formatShortDate(row.date), formatShortDate(row.end))
      : (day(row.date) ?? EMPTY_CELL);

  return (
    <PageSection
      id="schedule"
      title={t.title}
      description={t.description}
      action={
        canOrganize ? (
          <ScheduleEditButton
            projectId={projectId}
            sheetId={sheetId}
            own={own}
            fiche={{
              shootDate: day(logistics.shootDate.ficheValue),
              postStart: day(logistics.postStart.ficheValue),
              postEnd: day(logistics.postEnd.ficheValue),
              deliveryDate: day(logistics.deliveryDate.ficheValue),
              budgetEnvelopeCents: money(
                logistics.budgetEnvelopeCents.ficheValue,
              ),
            }}
            ficheValues={{
              shootDate: logistics.shootDate.ficheValue,
              postStart: logistics.postStart.ficheValue,
              postEnd: logistics.postEnd.ficheValue,
              deliveryDate: logistics.deliveryDate.ficheValue,
              budgetEnvelopeCents: logistics.budgetEnvelopeCents.ficheValue,
            }}
            ready={ready}
          />
        ) : undefined
      }
      card
    >
      <div className="flex flex-col gap-8">
        <p className="text-sm text-muted-foreground">
          {ownerName ? t.owner(ownerName) : t.ownerUnnamed}
        </p>
        <FactList
          emptyLabel={fr.productionPreprod.notFilled}
          facts={[
            fact(t.fields.shootDate, logistics.shootDate, day),
            fact(t.fields.postStart, logistics.postStart, day),
            fact(t.fields.postEnd, logistics.postEnd, day),
            fact(t.fields.deliveryDate, logistics.deliveryDate, day),
            fact(t.fields.envelope, logistics.budgetEnvelopeCents, money),
          ]}
        />
        {schedule.warnings.map((w) => (
          <ToneCallout key={w} tone="warning">
            {t.warnings[w]}
          </ToneCallout>
        ))}
        {logistics.shootDate.value && (
          <DataTable>
            <DataTableHeader>
              <DataTableHead fill>{t.columns.step}</DataTableHead>
              <DataTableHead hideBelow="sm">{t.columns.date}</DataTableHead>
              <DataTableHead align="end">{t.columns.state}</DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {schedule.rows.map((row) => {
                const state =
                  row.done === null
                    ? "untracked"
                    : row.done
                      ? "done"
                      : row.late
                        ? "late"
                        : "planned";
                return (
                  <DataTableRow key={row.step}>
                    <DataTableCell fill className="max-w-0">
                      <DataTableMedia
                        title={t.steps[row.step]}
                        subtitle={
                          row.dependsOn.length
                            ? t.after(
                                row.dependsOn.map((s) => t.steps[s]).join(", "),
                              )
                            : undefined
                        }
                      />
                    </DataTableCell>
                    <DataTableCell hideBelow="sm" className="tabular-nums">
                      {stepLabel(row)}
                    </DataTableCell>
                    <DataTableCell align="end">
                      {state === "untracked" ? (
                        EMPTY_CELL
                      ) : (
                        <StatusBadge tone={scheduleStepTone[state]} size="sm">
                          {t.states[state]}
                        </StatusBadge>
                      )}
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        )}
        {children}
      </div>
    </PageSection>
  );
}
