import { NoteKpiButton } from "@/components/strategy/follow-up/note-kpi-button";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { fr } from "@/lib/i18n/fr";
import type { KpiView } from "@/lib/strategy/follow-up";

const number = (n: number, unit: string | null) =>
  `${new Intl.NumberFormat("fr-FR").format(n)}${unit ? ` ${unit}` : ""}`;

/**
 * The KPIs of the strategy against what was really observed: target, real
 * value (noted, or Deezer read live), share of the target and its source.
 */
export function KpiTable({
  projectId,
  views,
  canNote,
  showActual,
}: {
  projectId: string;
  views: KpiView[];
  canNote: boolean;
  // Before the release, only the targets.
  showActual: boolean;
}) {
  const t = fr.strategyDocs.followUp;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.kpi}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.target}</DataTableHead>
        {showActual && <DataTableHead>{t.actual}</DataTableHead>}
        {showActual && (
          <DataTableHead hideBelow="md" align="end">
            {t.gap}
          </DataTableHead>
        )}
        {showActual && canNote && <DataTableActionsHead label={t.note} />}
      </DataTableHeader>
      <DataTableBody>
        {views.map((k) => (
          <DataTableRow key={k.id}>
            <DataTableCell fill>
              <span className="flex flex-col">
                <span className="font-semibold">{k.label}</span>
                {showActual && (k.live || k.actual_text) && (
                  <span className="text-caption text-muted-foreground">
                    {[
                      k.live ? t.source(t.sources.deezer_fans) : null,
                      k.actual_text,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </span>
            </DataTableCell>
            <DataTableCell hideBelow="sm">
              {k.target_value !== null
                ? number(k.target_value, k.unit)
                : (k.target_text ?? t.noTargetShort)}
            </DataTableCell>
            {showActual && (
              <DataTableCell>
                {k.value !== null ? number(k.value, k.unit) : t.noData}
              </DataTableCell>
            )}
            {showActual && (
              <DataTableCell hideBelow="md" align="end">
                {k.percent !== null ? t.percent(k.percent) : EMPTY_CELL}
              </DataTableCell>
            )}
            {showActual && canNote && (
              <DataTableActionsCell>
                {!k.live && <NoteKpiButton projectId={projectId} kpi={k} />}
              </DataTableActionsCell>
            )}
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
