import { RecordSelection } from "@/components/archive/record-selection";
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
import {
  SelectAllHead,
  SelectEmptyCell,
  SelectRowCell,
} from "@/components/ui/row-selection";
import { StatusBadge } from "@/components/ui/status-badge";
import type { RecordRights } from "@/lib/archive/types";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { progressLabel } from "@/lib/projects/progress";
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
  selectable = false,
}: {
  projects: ProjectListItem[];
  // The viewer's drafts of the new project form, listed first: a click
  // resumes the form.
  drafts?: ProjectDraftItem[];
  // Row actions ("⋯"); none when the viewer may neither edit nor archive.
  rights?: RecordRights;
  // Checkboxes to delete several at once (main list): projects for the
  // director, drafts for their author.
  selectable?: boolean;
}) {
  const t = fr.shell.projects;
  const withActions = rights && (rights.canEdit || rights.canArchive);
  // The director ticks projects; anyone ticks their own drafts.
  const canSelectProjects = selectable && Boolean(rights?.canArchive);
  const withSelection = canSelectProjects || (selectable && drafts.length > 0);
  const selection = fr.records.selection;

  const table = (
    <DataTable>
      <DataTableHeader>
        {withSelection && <SelectAllHead label={selection.all} />}
        <DataTableHead>{t.columns.title}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.artist}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.type}</DataTableHead>
        <DataTableHead fill>{t.columns.stage}</DataTableHead>
        {withActions && <DataTableActionsHead label={fr.records.menu.column} />}
      </DataTableHeader>
      <DataTableBody>
        {drafts.map((draft) => {
          const name = draft.title || fr.shell.newProject.draft.untitled;
          return (
            <DataTableRow key={`draft-${draft.id}`}>
              {withSelection && (
                <SelectRowCell
                  row={{ id: draft.id, name, draft: true }}
                  label={selection.row(name)}
                />
              )}
              <DataTableCell>
                <DataTableLink href={`${routes.projectsNew}?draft=${draft.id}`}>
                  {name}
                </DataTableLink>
              </DataTableCell>
              <DataTableCell hideBelow="sm">{EMPTY_CELL}</DataTableCell>
              <DataTableCell hideBelow="md">
                {draft.kind ? (
                  <ProjectKindBadge kind={draft.kind} />
                ) : (
                  EMPTY_CELL
                )}
              </DataTableCell>
              <DataTableCell fill>
                <StatusBadge tone={draftTone} size="sm">
                  {t.draft}
                </StatusBadge>
              </DataTableCell>
              {withActions && (
                <DataTableActionsCell>{null}</DataTableActionsCell>
              )}
            </DataTableRow>
          );
        })}
        {projects.map((project) => (
          <DataTableRow key={project.id}>
            {canSelectProjects ? (
              <SelectRowCell
                row={{ id: project.id, name: project.title }}
                label={selection.row(project.title)}
              />
            ) : (
              withSelection && <SelectEmptyCell />
            )}
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
            {/* Where it stands, in the words of the workflows, each in its
                hue. Before the launch, the handover status. */}
            <DataTableCell fill>
              {project.currentStage ? (
                <StatusBadge
                  tone={stageHue(project.currentStage.key)}
                  size="sm"
                >
                  {progressLabel(project.currentStage)}
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

  return withSelection ? (
    <RecordSelection kind="project">{table}</RecordSelection>
  ) : (
    table
  );
}
