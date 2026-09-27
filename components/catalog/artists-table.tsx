import { ArtistActions } from "@/components/catalog/artist-actions";
import { ArtistAvatar } from "@/components/catalog/artist-avatar";
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
import type { RecordRights } from "@/lib/archive/types";
import { routes } from "@/lib/auth/redirects";
import type { ArtistListItem } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

export function ArtistsTable({
  artists,
  rights,
}: {
  artists: ArtistListItem[];
  // Row actions ("⋯"); none when the viewer may neither edit nor archive.
  rights?: RecordRights;
}) {
  const t = fr.catalog.artists.columns;
  const withActions = rights && (rights.canEdit || rights.canArchive);

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.name}</DataTableHead>
        <DataTableHead>{t.masters}</DataTableHead>
        <DataTableHead hideBelow="md" fill>
          {t.notes}
        </DataTableHead>
        {withActions && <DataTableActionsHead label={fr.records.menu.column} />}
      </DataTableHeader>
      <DataTableBody>
        {artists.map((artist) => (
          <DataTableRow key={artist.id}>
            <DataTableCell>
              <DataTableMedia
                visual={
                  <ArtistAvatar
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
}
