import { StageStateBadge } from "@/components/projects/stage-state-badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { ProjectListItem } from "@/lib/projects/types";
import { projectStatusTone } from "@/lib/ui/state-tones";

export function ProjectsTable({ projects }: { projects: ProjectListItem[] }) {
  const t = fr.shell.projects;

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.columns.title}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.artist}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.type}</DataTableHead>
        <DataTableHead fill>{t.columns.stage}</DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {projects.map((project) => (
          <DataTableRow key={project.id}>
            <DataTableCell>
              <DataTableLink href={routes.project(project.id)}>
                {project.title}
              </DataTableLink>
            </DataTableCell>
            <DataTableCell hideBelow="sm">
              {project.artistName || EMPTY_CELL}
            </DataTableCell>
            <DataTableCell hideBelow="md">
              {fr.shell.projectTypes[project.type]}
            </DataTableCell>
            <DataTableCell fill>
              {project.currentStage ? (
                <span className="flex flex-wrap items-center gap-2">
                  {project.currentStage.label}
                  <StageStateBadge state={project.currentStage.state} />
                </span>
              ) : project.stageCount > 0 ? (
                <span>{t.allValidated}</span>
              ) : (
                <StatusBadge tone={projectStatusTone[project.status]} size="sm">
                  {fr.transmission.statuses[project.status]}
                </StatusBadge>
              )}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
