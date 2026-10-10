import { NoteKpiButton } from "@/components/strategy/follow-up/note-kpi-button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import type { KpiRow } from "@/lib/strategy/follow-up-results";

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const figure = (value: number, unit: string | null) =>
  [number.format(value), unit].filter(Boolean).join(" ");

/**
 * Each KPI of the strategy against its latest real value (ticket § 14):
 * read from Deezer or noted by a person, with the gap computed by code. No
 * value: « Pas encore de donnée », never a number; a qualitative KPI is a
 * signal to watch, never scored.
 */
export function KpiTable({
  projectId,
  kpis,
  canNote,
  today,
}: {
  projectId: string;
  kpis: KpiRow[];
  canNote: boolean;
  today: string;
}) {
  const t = fr.strategyFollowUp.kpis;
  if (kpis.length === 0)
    return <p className="text-body-md text-muted-foreground">{t.empty}</p>;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.kpi}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.target}</DataTableHead>
        <DataTableHead>{t.actual}</DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {kpis.map((k) => (
          <DataTableRow key={k.id}>
            <DataTableCell fill>
              <span className="flex min-w-0 flex-col">
                <span className="break-words">{k.label}</span>
                {k.kind === "qualitative" && (
                  <span className="text-caption text-muted-foreground">
                    {t.qualitativeHint}
                  </span>
                )}
              </span>
            </DataTableCell>
            <DataTableCell hideBelow="sm" className="tabular-nums">
              {k.target === null
                ? k.kind === "qualitative"
                  ? null
                  : t.noTarget
                : figure(k.target, k.unit)}
              {k.dueOn && (
                <span className="block text-caption text-muted-foreground">
                  {formatBriefDate(k.dueOn)}
                </span>
              )}
            </DataTableCell>
            <DataTableCell className="tabular-nums">
              {k.kind === "qualitative" ? (
                <span className="text-muted-foreground">{t.qualitative}</span>
              ) : k.actual ? (
                <span className="flex flex-col">
                  <span>{figure(k.actual.value, k.unit)}</span>
                  <span className="text-caption text-muted-foreground">
                    {[
                      t.measuredOn(
                        formatBriefDate(k.actual.on),
                        k.actual.source,
                      ),
                      k.percent !== null && t.progress(k.percent),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {k.unavailable ? t.unavailable : t.noData}
                </span>
              )}
              {canNote && k.kind === "quantitative" && !k.automatic && (
                <span className="mt-2 block">
                  <NoteKpiButton
                    projectId={projectId}
                    objectiveId={k.id}
                    label={k.label}
                    unit={k.unit}
                    today={today}
                  />
                </span>
              )}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
