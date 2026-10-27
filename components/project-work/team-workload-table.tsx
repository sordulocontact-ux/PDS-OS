import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { projectWork } from "@/lib/i18n/fr/project-work";
import type { WorkPerson } from "@/lib/project-work/queries";
import type { WorkCounts } from "@/lib/project-work/workload";

const fr = { projectWork };

const t = fr.projectWork;

// Internal members and their load.
export function TeamWorkloadTable({
  people,
  counts,
}: {
  people: WorkPerson[];
  counts: Map<string, WorkCounts>;
}) {
  const columns = ["todo", "overdue", "waiting"] as const;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.team.columns.person}</DataTableHead>
        {columns.map((c) => (
          <DataTableHead
            key={c}
            align="end"
            hideBelow={c === "waiting" ? "sm" : undefined}
          >
            {t.team.columns[c]}
          </DataTableHead>
        ))}
      </DataTableHeader>
      <DataTableBody>
        {people.map((p) => {
          const load = counts.get(p.personId);
          return (
            <DataTableRow key={p.personId}>
              <DataTableCell fill>
                <DataTableMedia
                  // The project's Travail lists the viewer's own actions
                  // (proto « Projet complet »): no per-person page any more.
                  title={p.name || t.work.unknownPerson}
                  subtitle={t.work.roles[p.role]}
                />
              </DataTableCell>
              {columns.map((c) => (
                <DataTableCell
                  key={c}
                  align="end"
                  hideBelow={c === "waiting" ? "sm" : undefined}
                  className="tabular-nums"
                >
                  {load?.[c] ?? 0}
                </DataTableCell>
              ))}
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
