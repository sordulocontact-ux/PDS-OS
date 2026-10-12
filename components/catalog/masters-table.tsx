import { RecordSelection } from "@/components/archive/record-selection";
import { MasterActions } from "@/components/catalog/master-actions";
import { TitleAudioState } from "@/components/catalog/title/title-audio-state";
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
import { Timestamp } from "@/components/ui/timestamp";
import type { RecordRights } from "@/lib/archive/types";
import { routes } from "@/lib/auth/redirects";
import { variantText } from "@/lib/catalog/title-rules";
import type { MasterRow } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import { masterReleaseTone } from "@/lib/ui/state-tones";

export function MastersTable({
  masters,
  rights,
  selectable = false,
  family = false,
}: {
  masters: MasterRow[];
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
        <DataTableHead>{t.columns.title}</DataTableHead>
        <DataTableHead>{t.columns.artists}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.audioState}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.project}</DataTableHead>
        <DataTableHead hideBelow="xl">{t.columns.lastChange}</DataTableHead>
        <DataTableHead hideBelow="2xl" fill>
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
                visual={<DataTableIcon icon={IconDisc} />}
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
            <DataTableCell>{master.artists}</DataTableCell>
            <DataTableCell hideBelow="sm">
              <TitleAudioState
                state={master.audioState}
                validated={master.finalValidatedAt !== null}
              />
            </DataTableCell>
            <DataTableCell hideBelow="md">
              {master.projects[0] ? (
                <span className="flex items-baseline gap-1.5">
                  {master.projects[0].title}
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
                <MasterActions master={master} rights={rights} />
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
