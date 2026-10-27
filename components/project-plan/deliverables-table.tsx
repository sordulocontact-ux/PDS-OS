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
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import { framing } from "@/lib/i18n/fr/framing";
import { projectPlan } from "@/lib/i18n/fr/project-plan";
import type { PlanDeliverable } from "@/lib/project-plan/queries";
import { deliverableStateTone } from "@/lib/ui/state-tones";

const fr = { framing, projectPlan };

/** Committed deliverables of a project, read only (written in the Strategy). */
export function DeliverablesTable({
  deliverables,
}: {
  deliverables: PlanDeliverable[];
}) {
  const t = fr.projectPlan.deliverables;
  const families = fr.framing.needs.families;

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.columns.name}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.lever}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.assignee}</DataTableHead>
        <DataTableHead hideBelow="lg">{t.columns.dueDate}</DataTableHead>
        <DataTableHead align="end">{t.columns.state}</DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {deliverables.map((d) => (
          <DataTableRow key={d.id}>
            <DataTableCell fill className="max-w-0">
              <DataTableMedia
                title={<span className="truncate">{d.title}</span>}
                subtitle={d.dueDate ? formatDay(d.dueDate) : t.noDueDate}
              />
            </DataTableCell>
            <DataTableCell hideBelow="md">
              <DataTableMedia
                title={<span className="truncate">{d.leverLabel}</span>}
                subtitle={d.family ? families[d.family] : undefined}
              />
            </DataTableCell>
            <DataTableCell
              hideBelow="sm"
              className={d.assigneeName ? undefined : "text-muted-foreground"}
            >
              {d.assigneeName ?? t.noAssignee}
            </DataTableCell>
            <DataTableCell hideBelow="lg" className="tabular-nums">
              {d.dueDate ? formatDay(d.dueDate) : EMPTY_CELL}
            </DataTableCell>
            <DataTableCell align="end">
              <StatusBadge tone={deliverableStateTone[d.state]} size="sm">
                {t.states[d.state]}
              </StatusBadge>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
