import { RecordSelection } from "@/components/archive/record-selection";
import { ReleaseCover } from "@/components/catalog/artist-profile/release-cover";
import { DraftRowActions } from "@/components/projects/draft-row-actions";
import { ProjectActions } from "@/components/projects/project-actions";
import { ProjectKindBadge } from "@/components/projects/project-kind-badge";
import { ProjectStepCell } from "@/components/projects/project-step-cell";
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
  DataTableText,
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
import { adminStatus } from "@/lib/projects/list-view";
import { formatShortDate } from "@/lib/release/format";
import type { ProjectDraftItem } from "@/lib/projects/drafts";
import type { ProjectListItem } from "@/lib/projects/types";
import {
  adminStatusTone,
  draftTone,
  projectPriorityTone,
} from "@/lib/ui/state-tones";

const fr = { shell, records };

export function ProjectsTable({
  projects,
  drafts = [],
  rights,
  selectable = false,
  withStep = true,
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
  // The current step column; an artist's page leaves it out (Sacha, 06/11).
  withStep?: boolean;
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
  // Covers only when one at least has one: the same grey disc on every row
  // says nothing (Sacha 24/11/2026), and the names stay aligned otherwise.
  const withCovers = projects.some((project) => project.coverUrl);

  const table = (
    <DataTable>
      <DataTableHeader>
        {withSelection && <SelectAllHead label={selection.all} />}
        <DataTableHead>{t.columns.title}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.artist}</DataTableHead>
        <DataTableHead hideBelow="xl">{t.columns.responsible}</DataTableHead>
        <DataTableHead hideBelow="2xl">{t.columns.type}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.due}</DataTableHead>
        <DataTableHead>{t.columns.status}</DataTableHead>
        {withStep && (
          <DataTableHead hideBelow="lg">{t.columns.step}</DataTableHead>
        )}
        <DataTableHead hideBelow="lg" fill>
          {t.columns.priority}
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
                <span className="flex min-w-0 items-center gap-3">
                  {withCovers && (
                    <ReleaseCover
                      coverUrl={null}
                      className="size-9 rounded-md"
                    />
                  )}
                  <DataTableLink
                    href={`${routes.projectsNew}?draft=${draft.id}`}
                  >
                    {name}
                  </DataTableLink>
                </span>
              </DataTableCell>
              <DataTableCell hideBelow="md">{EMPTY_CELL}</DataTableCell>
              <DataTableCell hideBelow="xl">{EMPTY_CELL}</DataTableCell>
              <DataTableCell hideBelow="2xl">
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
              {withStep && (
                <DataTableCell hideBelow="lg">{EMPTY_CELL}</DataTableCell>
              )}
              <DataTableCell hideBelow="lg" fill>
                {EMPTY_CELL}
              </DataTableCell>
              {withActions && (
                <DataTableActionsCell>
                  <DraftRowActions draftId={draft.id} name={name} reveal />
                </DataTableActionsCell>
              )}
            </DataTableRow>
          );
        })}
        {projects.map((project) => {
          const status = adminStatus(project);
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
                {/* Its cover next to its name (Sacha, 10/11/2026); none = the
                    Catalogue's disc on grey, not the overview's coloured visual. */}
                <span className="flex min-w-0 items-center gap-3">
                  {withCovers && (
                    <ReleaseCover
                      coverUrl={project.coverUrl ?? null}
                      className="size-9 rounded-md"
                    />
                  )}
                  <DataTableLink
                    href={rights?.archived ? null : routes.project(project.id)}
                  >
                    {project.title}
                  </DataTableLink>
                </span>
              </DataTableCell>
              {/* Its own column (Sacha 29/10), no longer under the name. */}
              <DataTableCell hideBelow="md">
                {(project.type === "music_release" || project.collective) &&
                project.artistName ? (
                  <DataTableText>{project.artistName}</DataTableText>
                ) : (
                  EMPTY_CELL
                )}
              </DataTableCell>
              <DataTableCell hideBelow="xl">
                {project.responsibleName ? (
                  <DataTableText>{project.responsibleName}</DataTableText>
                ) : (
                  EMPTY_CELL
                )}
              </DataTableCell>
              <DataTableCell hideBelow="2xl">
                <ProjectKindBadge
                  kind={project}
                  collective={project.collective}
                />
              </DataTableCell>
              <DataTableCell
                hideBelow="sm"
                // The figures' typeface on a date only, never on « Sans
                // échéance ».
                className={
                  project.dueDate
                    ? "tabular-nums"
                    : "text-[color:var(--text-secondary)]"
                }
              >
                {project.dueDate ? formatShortDate(project.dueDate) : t.noDue}
              </DataTableCell>
              <DataTableCell>
                <StatusBadge tone={adminStatusTone[status]} size="sm">
                  {t.adminStatuses[status]}
                </StatusBadge>
              </DataTableCell>
              {withStep && (
                <DataTableCell hideBelow="lg">
                  <ProjectStepCell project={project} />
                </DataTableCell>
              )}
              <DataTableCell hideBelow="lg" fill>
                {project.priority ? (
                  <StatusBadge
                    tone={projectPriorityTone[project.priority]}
                    size="sm"
                  >
                    {fr.shell.priorities[project.priority]}
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
                      reveal
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
