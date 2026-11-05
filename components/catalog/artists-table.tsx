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
import type { ArtistRow } from "@/lib/catalog/artist-progress";
import { catalog } from "@/lib/i18n/fr/catalog";
import { records } from "@/lib/i18n/fr/records";
import { formatShortDate } from "@/lib/release/format";

const fr = { catalog, records };

const secondary = "text-[color:var(--text-secondary)]";
const sub =
  "block text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]";

/** A value and, under it, what it says more (proto `.sub`). */
function Lines({ main, under }: { main: string; under?: string | null }) {
  return (
    <span className="block">
      <span className="block break-words">{main}</span>
      {under && <span className={sub}>{under}</span>}
    </span>
  );
}

/**
 * The artists list (proto `docs/protos/pages.html`, « Artistes », Sacha
 * 29/10: only the list): name, relation, titles, each launched project and
 * where it stands, the next release and how far.
 */
export function ArtistsTable({
  artists,
  showRelation = false,
  rights,
  selectable = false,
}: {
  artists: ArtistRow[];
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
        <DataTableHead hideBelow="sm">{t.masters}</DataTableHead>
        <DataTableHead>{t.ongoing}</DataTableHead>
        <DataTableHead hideBelow="md" fill>
          {t.nextRelease}
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
              <DataTableCell hideBelow="sm" className={secondary}>
                {relationLabels[artist.relation]}
              </DataTableCell>
            )}
            <DataTableCell hideBelow="sm" className="tabular-nums">
              {artist.masterCount}
            </DataTableCell>
            <DataTableCell>
              {/* One project, the others counted: a row stays one row. Their
                  names on hover. */}
              {artist.ongoing.length > 0 ? (
                <span
                  className="block"
                  title={artist.ongoing.map((p) => p.title).join(", ")}
                >
                  <span className="block break-words">
                    {artist.ongoing[0]!.title}
                    {artist.ongoing.length > 1 && (
                      <span className={secondary}>
                        {" "}
                        {fr.catalog.artists.ongoingMore(
                          artist.ongoing.length - 1,
                        )}
                      </span>
                    )}
                  </span>
                  {artist.ongoing[0]!.place && (
                    <span className={sub}>{artist.ongoing[0]!.place}</span>
                  )}
                </span>
              ) : (
                <span className={secondary}>
                  {fr.catalog.artists.noOngoing}
                </span>
              )}
            </DataTableCell>
            <DataTableCell hideBelow="md" fill className="tabular-nums">
              {artist.next ? (
                <Lines
                  main={formatShortDate(artist.next.date)}
                  under={fr.catalog.artists.nextRelease(
                    artist.next.projectTitle,
                    artist.next.days,
                  )}
                />
              ) : (
                <span className={secondary}>{EMPTY_CELL}</span>
              )}
            </DataTableCell>
            {withActions && (
              <DataTableActionsCell>
                <ArtistActions artist={artist} rights={rights} reveal />
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
