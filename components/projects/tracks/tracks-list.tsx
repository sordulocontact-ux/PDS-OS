import { IconDisc } from "@/components/icons";
import {
  WorkflowProgress,
  WorkflowRing,
} from "@/components/projects/tracks/workflow-progress";
import { EmptyState } from "@/components/shell/empty-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableGroupRow,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { routes } from "@/lib/auth/redirects";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { titleTracks } from "@/lib/i18n/fr/title-tracks";
import { joinArtistNames } from "@/lib/projects/participation-rules";
import type { TitleProgress } from "@/lib/projects/title-journeys";
import { masterNameOf } from "@/lib/projects/title-rules";
import type { WorkflowKey } from "@/lib/workflow-status/rules";
import { cn } from "@/lib/utils";

const fr = { projectTitles, titleTracks };
const t = fr.titleTracks.list;

// Three workflows of 192 px beside the title fit from 1280 px with the
// sidebars.

/**
 * « Titres » of a collective (Maël 25/11/2026: the title as the way in):
 * one row per title, its Master, Juridique and Distribution each as a ring
 * and the step it is at, « À vous » under it when it is the viewer's — two
 * lines a cell, never more (Maël, same day); the row opens the title's
 * page, where the rest is. The live titles, then the abandoned ones (out
 * of every workflow, lot 9). `workflows`: the columns, the workflows of the
 * project worked by title that the viewer may open. Under 1280 px, the
 * rings on one line under the title's name, in place of its guests. No
 * title yet: the board's empty state, « Ajouter un titre » being in the
 * head of « Titres » (`canManage`).
 */
export function TracksList({
  projectId,
  rows,
  workflows,
  canManage,
}: {
  projectId: string;
  rows: TitleProgress[];
  workflows: WorkflowKey[];
  canManage: boolean;
}) {
  if (rows.length === 0) {
    const empty = fr.projectTitles.board.empty;
    return (
      <EmptyState
        icon={IconDisc}
        title={empty.title}
        body={canManage ? empty.body : empty.readOnly}
      />
    );
  }
  const live = rows.filter((r) => !r.abandoned);
  const abandoned = rows.filter((r) => r.abandoned);
  const columns = 1 + workflows.length;
  const row = (r: TitleProgress) => (
    <TrackRow
      key={r.title.id}
      projectId={projectId}
      row={r}
      workflows={workflows}
    />
  );
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.columns.title}</DataTableHead>
        {workflows.map((workflow) => (
          <DataTableHead key={workflow} hideBelow="xl">
            {t.columns[workflow as keyof typeof t.columns]}
          </DataTableHead>
        ))}
      </DataTableHeader>
      <DataTableBody>
        {live.map(row)}
        {abandoned.length > 0 && (
          <DataTableGroupRow columns={columns}>
            <span className="text-[length:var(--type-body-md)] font-semibold">
              {t.groups.abandoned}
            </span>
          </DataTableGroupRow>
        )}
        {abandoned.map(row)}
      </DataTableBody>
    </DataTable>
  );
}

function TrackRow({
  projectId,
  row,
  workflows,
}: {
  projectId: string;
  row: TitleProgress;
  workflows: WorkflowKey[];
}) {
  const cardOf = (workflow: WorkflowKey) =>
    row.cards.find((card) => card.workflow === workflow);
  // An unnamed title's label already names its guests.
  const named = row.title.workingTitle ?? masterNameOf(row.title.master);
  const guests =
    named && row.guests.length > 0 ? joinArtistNames(row.guests) : null;
  return (
    <DataTableRow>
      <DataTableCell fill>
        <DataTableMedia
          title={
            <DataTableLink href={routes.projectTrack(projectId, row.title.id)}>
              <span
                className={cn(
                  row.abandoned && "text-[color:var(--text-secondary)]",
                )}
              >
                {row.label}
              </span>
            </DataTableLink>
          }
          subtitle={
            row.abandoned ? (
              guests
            ) : (
              <>
                {guests && <span className="max-xl:hidden">{guests}</span>}
                {/* Under 1280 px, the workflows in its place. */}
                <span className="flex gap-3 pt-1 xl:hidden">
                  {workflows.map((workflow) => (
                    <WorkflowRing
                      key={workflow}
                      card={cardOf(workflow)}
                      label={t.columns[workflow as keyof typeof t.columns]}
                    />
                  ))}
                </span>
              </>
            )
          }
        />
      </DataTableCell>
      {workflows.map((workflow) => (
        <DataTableCell key={workflow} hideBelow="xl">
          <WorkflowProgress card={cardOf(workflow)} />
        </DataTableCell>
      ))}
    </DataTableRow>
  );
}
