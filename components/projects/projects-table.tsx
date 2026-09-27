import { ProjectActions } from "@/components/projects/project-actions";
import { StageStateBadge } from "@/components/projects/stage-state-badge";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import type { RecordRights } from "@/lib/archive/types";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { projectKindLabel } from "@/lib/projects/labels";
import type { ProjectListItem } from "@/lib/projects/types";
import { projectPriorityTone, projectStatusTone } from "@/lib/ui/state-tones";

export function ProjectsTable({
  projects,
  rights,
}: {
  projects: ProjectListItem[];
  // Row actions ("⋯"); none when the viewer may neither edit nor archive.
  rights?: RecordRights;
}) {
  const t = fr.shell.projects;
  const withActions = rights && (rights.canEdit || rights.canArchive);

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.columns.title}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.artist}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.type}</DataTableHead>
        <DataTableHead fill>{t.columns.stage}</DataTableHead>
        {withActions && <DataTableActionsHead label={fr.records.menu.column} />}
      </DataTableHeader>
      <DataTableBody>
        {projects.map((project) => (
          <DataTableRow key={project.id}>
            <DataTableCell>
              <span className="flex flex-wrap items-center gap-2">
                <DataTableLink
                  href={rights?.archived ? null : routes.project(project.id)}
                >
                  {project.title}
                </DataTableLink>
                {project.priority === "high" && (
                  <StatusBadge tone={projectPriorityTone.high} size="sm">
                    {fr.shell.highPriority}
                  </StatusBadge>
                )}
              </span>
            </DataTableCell>
            <DataTableCell hideBelow="sm">
              {project.artistName || EMPTY_CELL}
            </DataTableCell>
            <DataTableCell hideBelow="md">
              {projectKindLabel(project)}
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
            {withActions && (
              <DataTableActionsCell>
                <ProjectActions
                  project={{
                    id: project.id,
                    title: project.title,
                    launched: project.stageCount > 0,
                  }}
                  rights={rights}
                />
              </DataTableActionsCell>
            )}
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
