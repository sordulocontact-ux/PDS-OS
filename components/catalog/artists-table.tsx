import { RecordSelection } from "@/components/archive/record-selection";
import { ArtistActions } from "@/components/catalog/artist-actions";
import { Avatar } from "@/components/ui/avatar";
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
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { SelectAllHead, SelectRowCell } from "@/components/ui/row-selection";
import type { RecordRights } from "@/lib/archive/types";
import { routes } from "@/lib/auth/redirects";
import type { ArtistListItem } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

export function ArtistsTable({
  artists,
  showRelation = false,
  rights,
  selectable = false,
}: {
  artists: ArtistListItem[];
  // "Signé" / "Collaboration" as plain text, when the list mixes both.
  showRelation?: boolean;
  // Row actions ("⋯"); none when the viewer may neither edit nor archive.
  rights?: RecordRights;
  // Checkboxes to delete several at once (main list, director only).
  selectable?: boolean;
}) {
  const t = fr.catalog.artists.columns;
  const relationLabels = fr.catalog.relation.labels;
  const withActions = rights && (rights.canEdit || rights.canArchive);
  const withSelection = selectable && rights?.canArchive;
  const selection = fr.records.selection;

  const table = (
    <DataTable>
      <DataTableHeader>
        {withSelection && <SelectAllHead label={selection.all} />}
        <DataTableHead>{t.name}</DataTableHead>
        {showRelation && (
          <DataTableHead hideBelow="sm">{t.relation}</DataTableHead>
        )}
        <DataTableHead>{t.masters}</DataTableHead>
        <DataTableHead hideBelow="md" fill>
          {t.notes}
        </DataTableHead>
        {withActions && <DataTableActionsHead label={fr.records.menu.column} />}
      </DataTableHeader>
      <DataTableBody>
        {artists.map((artist) => (
          <DataTableRow key={artist.id}>
            {withSelection && (
              <SelectRowCell
                row={{ id: artist.id, name: artist.name }}
                label={selection.row(artist.name)}
              />
            )}
            <DataTableCell>
              <DataTableMedia
                visual={
                  <Avatar
                    name={artist.name}
                    pictureUrl={artist.pictureUrl}
                    className="size-9"
                  />
                }
                title={
                  <DataTableLink
                    href={rights?.archived ? null : routes.artist(artist.id)}
                  >
                    {artist.name}
                  </DataTableLink>
                }
              />
            </DataTableCell>
            {showRelation && (
              <DataTableCell
                hideBelow="sm"
                className="text-[color:var(--text-secondary)]"
              >
                {relationLabels[artist.relation]}
              </DataTableCell>
            )}
            <DataTableCell className="tabular-nums">
              {artist.masterCount}
            </DataTableCell>
            <DataTableCell
              hideBelow="md"
              fill
              className="max-w-md truncate text-[color:var(--text-secondary)]"
            >
              {artist.notes || EMPTY_CELL}
            </DataTableCell>
            {withActions && (
              <DataTableActionsCell>
                <ArtistActions artist={artist} rights={rights} />
              </DataTableActionsCell>
            )}
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );

  return withSelection ? (
    <RecordSelection kind="artist" archived={rights?.archived}>
      {table}
    </RecordSelection>
  ) : (
    table
  );
}
