import Link from "next/link";

import { IconDisc } from "@/components/icons";
import { WorkflowProgress } from "@/components/projects/tracks/workflow-progress";
import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableGroupRow,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
} from "@/components/ui/data-table";
import { routes } from "@/lib/auth/redirects";
import { titleTracks } from "@/lib/i18n/fr/title-tracks";
import { joinArtistNames } from "@/lib/projects/participation-rules";
import type { TitleProgress } from "@/lib/projects/title-journeys";
import { masterNameOf } from "@/lib/projects/title-rules";
import type { WorkflowKey } from "@/lib/workflow-status/rules";
import { cn } from "@/lib/utils";

const fr = { titleTracks };
const t = fr.titleTracks.list;

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]";

// Three workflows beside the title fit from 1280 px with the sidebar.
const COLUMN = "w-56 whitespace-normal";

/**
 * « Titres » of a collective (Maël 25/11/2026: the title as the way in):
 * one row per title, its Master, Juridique and Distribution as a project's
 * « Progression » says them (a ring, then « Étape n sur N · … » or « À
 * vous : … »); the row opens the title's page. The live titles, then the
 * abandoned ones (out of every workflow, lot 9). `workflows`: the columns,
 * the workflows of the project worked by title that the viewer may open.
 * Under 1280 px, the workflows under the title's name.
 */
export function TracksList({
  projectId,
  rows,
  workflows,
}: {
  projectId: string;
  rows: TitleProgress[];
  workflows: WorkflowKey[];
}) {
  if (rows.length === 0)
    return (
      <EmptyState
        icon={IconDisc}
        title={t.empty.title}
        body={t.empty.body}
        action={
          <Link
            href={routes.projectTitles(projectId)}
            className={buttonVariants({ variant: "outline" })}
          >
            {t.empty.action}
          </Link>
        }
      />
    );
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
          <DataTableHead key={workflow} hideBelow="xl" className={COLUMN}>
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
      <DataTableCell fill className="whitespace-normal">
        <span className="flex min-w-0 flex-col gap-1">
          <DataTableLink href={routes.projectTrack(projectId, row.title.id)}>
            <span
              className={cn(
                "font-medium break-words",
                row.abandoned && "text-[color:var(--text-secondary)]",
              )}
            >
              {row.label}
            </span>
          </DataTableLink>
          {guests && <span className={caption}>{guests}</span>}
          {/* Under 1280 px, the workflows under the name. */}
          {!row.abandoned && (
            <span className="flex flex-col gap-1.5 pt-1 xl:hidden">
              {workflows.map((workflow) => (
                <span
                  key={workflow}
                  className="flex flex-wrap items-center gap-x-2"
                >
                  <span className={cn(caption, "w-24 shrink-0")}>
                    {t.columns[workflow as keyof typeof t.columns]}
                  </span>
                  <WorkflowProgress card={cardOf(workflow)} />
                </span>
              ))}
            </span>
          )}
        </span>
      </DataTableCell>
      {workflows.map((workflow) => (
        <DataTableCell key={workflow} hideBelow="xl" className={COLUMN}>
          <WorkflowProgress card={cardOf(workflow)} />
        </DataTableCell>
      ))}
    </DataTableRow>
  );
}
