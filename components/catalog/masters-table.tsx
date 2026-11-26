import { RecordSelection } from "@/components/archive/record-selection";
import { ReleaseCover } from "@/components/catalog/artist-profile/release-cover";
import { MasterActions } from "@/components/catalog/master-actions";
import { TitleAudioState } from "@/components/catalog/title/title-audio-state";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  DataTableText,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { SelectAllHead, SelectRowCell } from "@/components/ui/row-selection";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timestamp } from "@/components/ui/timestamp";
import type { RecordRights } from "@/lib/archive/types";
import { routes } from "@/lib/auth/redirects";
import { variantText } from "@/lib/catalog/title-rules";
import type { MasterRow } from "@/lib/catalog/types";
import { catalog } from "@/lib/i18n/fr/catalog";
import { records } from "@/lib/i18n/fr/records";
import { formatShortDate } from "@/lib/release/format";
import { masterReleaseTone } from "@/lib/ui/state-tones";

const fr = { catalog, records };

export function MastersTable({
  masters,
  covers,
  rights,
  selectable = false,
  family = false,
}: {
  masters: MasterRow[];
  // Each title's cover (small copy), by title id: a square, the disc on
  // grey when it has none. Without it, the round disc of every row.
  covers?: Record<string, string>;
  // Row actions ("⋯"); none when the viewer may neither edit nor archive.
  rights?: RecordRights;
  // Checkboxes to delete several at once (main list, director only).
  selectable?: boolean;
  // A title's family (retour 08): the original is named as such too.
  family?: boolean;
}) {
  const t = fr.catalog.masters;
  const withActions = rights && (rights.canEdit || rights.canArchive);
  const withSelection = selectable && rights?.canArchive;
  const selection = fr.records.selection;

  const table = (
    <DataTable>
      <DataTableHeader>
        {withSelection && <SelectAllHead label={selection.all} />}
        <DataTableHead icon="master">{t.columns.title}</DataTableHead>
        <DataTableHead icon="artist">{t.columns.artists}</DataTableHead>
        <DataTableHead icon="audio" hideBelow="sm">
          {t.columns.audioState}
        </DataTableHead>
        <DataTableHead icon="project" hideBelow="md">
          {t.columns.project}
        </DataTableHead>
        <DataTableHead icon="updated" hideBelow="xl">
          {t.columns.lastChange}
        </DataTableHead>
        <DataTableHead icon="release" hideBelow="2xl" fill>
          {t.columns.release}
        </DataTableHead>
        {withActions && <DataTableActionsHead label={fr.records.menu.column} />}
      </DataTableHeader>
      <DataTableBody>
        {masters.map((master) => (
          <DataTableRow key={master.id}>
            {withSelection && (
              <SelectRowCell
                row={{ id: master.id, name: master.title }}
                label={selection.row(master.title)}
              />
            )}
            <DataTableCell>
              <DataTableMedia
                // Its cover; no disc repeated on every row without one
                // (Sacha 24/11/2026).
                visual={
                  covers && (
                    <ReleaseCover
                      coverUrl={covers[master.id] ?? null}
                      className="size-9 rounded-md"
                    />
                  )
                }
                title={
                  <DataTableLink
                    href={rights?.archived ? null : routes.master(master.id)}
                  >
                    {master.title}
                  </DataTableLink>
                }
                subtitle={
                  variantText(master) ??
                  (family ? fr.catalog.variants.original : null)
                }
              />
            </DataTableCell>
            <DataTableCell>
              <DataTableText>{master.artists}</DataTableText>
            </DataTableCell>
            <DataTableCell hideBelow="sm">
              <TitleAudioState
                state={master.audioState}
                validated={master.finalValidatedAt !== null}
              />
            </DataTableCell>
            <DataTableCell hideBelow="md">
              {master.projects[0] ? (
                <span className="flex max-w-48 items-baseline gap-1.5">
                  <span className="truncate">{master.projects[0].title}</span>
                  {master.projects.length > 1 && (
                    <span className="text-[color:var(--text-tertiary)]">
                      <span aria-hidden>
                        {t.otherProjects.short(master.projects.length - 1)}
                      </span>
                      <span className="sr-only">
                        {t.otherProjects.full(master.projects.length - 1)}
                      </span>
                    </span>
                  )}
                </span>
              ) : (
                EMPTY_CELL
              )}
            </DataTableCell>
            <DataTableCell hideBelow="xl">
              <Timestamp iso={master.lastChangedAt} show="day" />
            </DataTableCell>
            <DataTableCell hideBelow="2xl" fill>
              {!master.release ? (
                EMPTY_CELL
              ) : master.release.status === "online" ? (
                <StatusBadge tone={masterReleaseTone.online} size="sm">
                  {t.releaseStatus.online}
                </StatusBadge>
              ) : master.release.plannedReleaseDate ? (
                formatShortDate(master.release.plannedReleaseDate)
              ) : (
                <span className="text-[color:var(--text-tertiary)]">
                  {t.releaseStatus.undated}
                </span>
              )}
            </DataTableCell>
            {withActions && (
              <DataTableActionsCell>
                <MasterActions master={master} rights={rights} reveal />
              </DataTableActionsCell>
            )}
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );

  return withSelection ? (
    <RecordSelection kind="master" archived={rights?.archived}>
      {table}
    </RecordSelection>
  ) : (
    table
  );
}
