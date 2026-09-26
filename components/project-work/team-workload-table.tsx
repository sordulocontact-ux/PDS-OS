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
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { WorkPerson } from "@/lib/project-work/queries";
import type { WorkCounts } from "@/lib/project-work/workload";

const t = fr.projectWork;

// Internal members and their load; a row opens their card on Travail.
export function TeamWorkloadTable({
  projectId,
  people,
  counts,
}: {
  projectId: string;
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
                  title={
                    <DataTableLink
                      href={`${routes.projectWork(projectId)}?person=${p.personId}`}
                    >
                      {p.name || t.work.unknownPerson}
                    </DataTableLink>
                  }
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
