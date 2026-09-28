import { ProjectActions } from "@/components/projects/project-actions";
import { ProjectKindBadge } from "@/components/projects/project-kind-badge";
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
import type { ProjectDraftItem } from "@/lib/projects/drafts";
import type { ProjectListItem } from "@/lib/projects/types";
import { stageHue } from "@/lib/ui/category-hues";
import {
  draftTone,
  doneTone,
  projectPriorityTone,
  projectStatusTone,
} from "@/lib/ui/state-tones";

export function ProjectsTable({
  projects,
  drafts = [],
  rights,
}: {
  projects: ProjectListItem[];
  // The viewer's drafts of the new project form, listed first: a click
  // resumes the form.
  drafts?: ProjectDraftItem[];
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
        {drafts.map((draft) => (
          <DataTableRow key={`draft-${draft.id}`}>
            <DataTableCell>
              <DataTableLink href={`${routes.projectsNew}?draft=${draft.id}`}>
                {draft.title || fr.shell.newProject.draft.untitled}
              </DataTableLink>
            </DataTableCell>
            <DataTableCell hideBelow="sm">{EMPTY_CELL}</DataTableCell>
            <DataTableCell hideBelow="md">
              {draft.kind ? <ProjectKindBadge kind={draft.kind} /> : EMPTY_CELL}
            </DataTableCell>
            <DataTableCell fill>
              <StatusBadge tone={draftTone} size="sm">
                {t.draft}
              </StatusBadge>
            </DataTableCell>
            {withActions && <DataTableActionsCell>{null}</DataTableActionsCell>}
          </DataTableRow>
        ))}
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
              <ProjectKindBadge kind={project} />
            </DataTableCell>
            {/* The stage only, each in its hue: its state (en cours, à
                venir…) is read on the project itself. Before the launch,
                the handover status. */}
            <DataTableCell fill>
              {project.currentStage ? (
                <StatusBadge
                  tone={stageHue(project.currentStage.key)}
                  size="sm"
                >
                  {project.currentStage.label}
                </StatusBadge>
              ) : project.stageCount > 0 ? (
                <StatusBadge tone={doneTone} size="sm">
                  {t.allValidated}
                </StatusBadge>
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
