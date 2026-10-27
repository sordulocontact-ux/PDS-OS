import { RecordSelection } from "@/components/archive/record-selection";
import { DraftRowActions } from "@/components/projects/draft-row-actions";
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
import { records } from "@/lib/i18n/fr/records";
import { shell } from "@/lib/i18n/fr/shell";
import { adminStatus, phaseLabel } from "@/lib/projects/list-view";
import { formatShortDate } from "@/lib/release/format";
import { cn } from "@/lib/utils";
import type { ProjectDraftItem } from "@/lib/projects/drafts";
import type { ProjectListItem } from "@/lib/projects/types";
import { stageHue } from "@/lib/ui/category-hues";
import {
  adminStatusTone,
  draftTone,
  doneTone,
  projectPriorityTone,
} from "@/lib/ui/state-tones";

const fr = { shell, records };

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
  const projectActions = Boolean(
    rights && (rights.canEdit || rights.canArchive),
  );
  // A draft always has its « ⋯ » (resume, delete): its author owns it.
  const withActions = projectActions || drafts.length > 0;
  // The director ticks projects; anyone ticks their own drafts.
  const canSelectProjects = selectable && Boolean(rights?.canArchive);
  const withSelection = canSelectProjects || (selectable && drafts.length > 0);
  const selection = fr.records.selection;

  const table = (
    <DataTable>
      <DataTableHeader>
        {withSelection && <SelectAllHead label={selection.all} />}
        <DataTableHead>{t.columns.title}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.responsible}</DataTableHead>
        <DataTableHead hideBelow="lg">{t.columns.type}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.due}</DataTableHead>
        <DataTableHead>{t.columns.status}</DataTableHead>
        <DataTableHead hideBelow="lg" fill>
          {t.columns.phase}
        </DataTableHead>
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
              <DataTableCell hideBelow="md">{EMPTY_CELL}</DataTableCell>
              <DataTableCell hideBelow="lg">
                {draft.kind ? (
                  <ProjectKindBadge kind={draft.kind} />
                ) : (
                  EMPTY_CELL
                )}
              </DataTableCell>
              <DataTableCell
                hideBelow="sm"
                className="text-[color:var(--text-secondary)]"
              >
                {t.noDue}
              </DataTableCell>
              <DataTableCell>
                <StatusBadge tone={draftTone} size="sm">
                  {t.draft}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell hideBelow="lg" fill>
                {EMPTY_CELL}
              </DataTableCell>
              {withActions && (
                <DataTableActionsCell>
                  <DraftRowActions draftId={draft.id} name={name} />
                </DataTableActionsCell>
              )}
            </DataTableRow>
          );
        })}
        {projects.map((project) => {
          const status = adminStatus(project);
          const phase = phaseLabel(project);
          return (
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
                <span className="flex flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <DataTableLink
                      href={
                        rights?.archived ? null : routes.project(project.id)
                      }
                    >
                      {project.title}
                    </DataTableLink>
                    {project.priority === "high" && (
                      <StatusBadge tone={projectPriorityTone.high} size="sm">
                        {fr.shell.highPriority}
                      </StatusBadge>
                    )}
                  </span>
                  {/* The artist under a musical project's name. */}
                  {project.type === "music_release" && project.artistName && (
                    <span className="text-caption text-[color:var(--text-secondary)]">
                      {project.artistName}
                    </span>
                  )}
                </span>
              </DataTableCell>
              <DataTableCell hideBelow="md">
                {project.responsibleName ?? EMPTY_CELL}
              </DataTableCell>
              <DataTableCell hideBelow="lg">
                <ProjectKindBadge kind={project} />
              </DataTableCell>
              <DataTableCell
                hideBelow="sm"
                className={cn(
                  "tabular-nums",
                  !project.dueDate && "text-[color:var(--text-secondary)]",
                )}
              >
                {project.dueDate ? formatShortDate(project.dueDate) : t.noDue}
              </DataTableCell>
              <DataTableCell>
                <StatusBadge tone={adminStatusTone[status]} size="sm">
                  {t.adminStatuses[status]}
                </StatusBadge>
              </DataTableCell>
              {/* Where it stands, in the words of its workflows, in its hue. */}
              <DataTableCell hideBelow="lg" fill>
                {phase && project.currentStage ? (
                  <StatusBadge
                    tone={stageHue(project.currentStage.key)}
                    size="sm"
                  >
                    {phase}
                  </StatusBadge>
                ) : phase ? (
                  <StatusBadge tone={doneTone} size="sm">
                    {phase}
                  </StatusBadge>
                ) : (
                  EMPTY_CELL
                )}
              </DataTableCell>
              {withActions && (
                <DataTableActionsCell>
                  {projectActions && rights && (
                    <ProjectActions
                      project={{
                        id: project.id,
                        title: project.title,
                        launched: project.stageCount > 0,
                      }}
                      rights={rights}
                    />
                  )}
                </DataTableActionsCell>
              )}
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );

  return withSelection ? (
    <RecordSelection kind="project" archived={rights?.archived}>
      {table}
    </RecordSelection>
  ) : (
    table
  );
}
