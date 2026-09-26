import { ArtistAvatar } from "@/components/catalog/artist-avatar";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { routes } from "@/lib/auth/redirects";
import type { ArtistListItem } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

export function ArtistsTable({ artists }: { artists: ArtistListItem[] }) {
  const t = fr.catalog.artists.columns;

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.name}</DataTableHead>
        <DataTableHead>{t.masters}</DataTableHead>
        <DataTableHead hideBelow="md" fill>
          {t.notes}
        </DataTableHead>
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
                  <DataTableLink href={routes.artist(artist.id)}>
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
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
