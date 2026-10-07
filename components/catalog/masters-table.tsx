import { RecordSelection } from "@/components/archive/record-selection";
import { MasterActions } from "@/components/catalog/master-actions";
import { AudioStateBadge } from "@/components/catalog/title/audio-state-badge";
import { IconDisc } from "@/components/icons";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableIcon,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { SelectAllHead, SelectRowCell } from "@/components/ui/row-selection";
import { StatusBadge } from "@/components/ui/status-badge";
import type { RecordRights } from "@/lib/archive/types";
import { routes } from "@/lib/auth/redirects";
import { variantText } from "@/lib/catalog/title-rules";
import { formatIsrc, type MasterRow } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import { masterReleaseTone } from "@/lib/ui/state-tones";

export function MastersTable({
  masters,
  rights,
  selectable = false,
}: {
  masters: MasterRow[];
  // Row actions ("⋯"); none when the viewer may neither edit nor archive.
  rights?: RecordRights;
  // Checkboxes to delete several at once (main list, director only).
  selectable?: boolean;
}) {
  const t = fr.catalog.masters;
  const withActions = rights && (rights.canEdit || rights.canArchive);
  const withSelection = selectable && rights?.canArchive;
  const selection = fr.records.selection;

  const table = (
    <DataTable>
      <DataTableHeader>
        {withSelection && <SelectAllHead label={selection.all} />}
        <DataTableHead>{t.columns.title}</DataTableHead>
        <DataTableHead>{t.columns.artists}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.audioState}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.isrc}</DataTableHead>
        <DataTableHead hideBelow="lg">{t.columns.release}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.releaseDate}</DataTableHead>
        <DataTableHead fill>{t.columns.status}</DataTableHead>
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
                visual={<DataTableIcon icon={IconDisc} />}
                title={
                  <DataTableLink
                    href={rights?.archived ? null : routes.master(master.id)}
                  >
                    {master.title}
                  </DataTableLink>
                }
                subtitle={variantText(master)}
              />
            </DataTableCell>
            <DataTableCell>{master.artists}</DataTableCell>
            <DataTableCell hideBelow="sm">
              {master.audioState ? (
                <AudioStateBadge state={master.audioState} size="sm" />
              ) : (
                EMPTY_CELL
              )}
            </DataTableCell>
            <DataTableCell hideBelow="md">
              {master.isrc ? formatIsrc(master.isrc) : EMPTY_CELL}
            </DataTableCell>
            <DataTableCell hideBelow="lg">
              {master.release ? (
                <span className="flex items-baseline gap-1.5">
                  {master.release.title}
                  {master.release.otherCount > 0 && (
                    <span className="text-[color:var(--text-tertiary)]">
                      <span aria-hidden>
                        {t.otherReleases.short(master.release.otherCount)}
                      </span>
                      <span className="sr-only">
                        {t.otherReleases.full(master.release.otherCount)}
                      </span>
                    </span>
                  )}
                </span>
              ) : (
                EMPTY_CELL
              )}
            </DataTableCell>
            <DataTableCell hideBelow="sm">
              {master.release?.plannedReleaseDate
                ? formatShortDate(master.release.plannedReleaseDate)
                : EMPTY_CELL}
            </DataTableCell>
            <DataTableCell fill>
              {master.release ? (
                <StatusBadge tone={masterReleaseTone[master.release.status]}>
                  {t.releaseStatus[master.release.status]}
                </StatusBadge>
              ) : (
                EMPTY_CELL
              )}
            </DataTableCell>
            {withActions && (
              <DataTableActionsCell>
                <MasterActions master={master} rights={rights} />
              </DataTableActionsCell>
            )}
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );

  return withSelection ? (
    <RecordSelection kind="master">{table}</RecordSelection>
  ) : (
    table
  );
}
