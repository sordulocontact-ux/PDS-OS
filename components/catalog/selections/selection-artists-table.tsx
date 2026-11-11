"use client";

import { IconXmark } from "nucleo-sharp-essential";
import { useTransition } from "react";

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
} from "@/components/ui/data-table";
import { RowActions } from "@/components/ui/row-actions";
import { toast } from "@/components/ui/toast";
import { routes } from "@/lib/auth/redirects";
import { removeArtistFromSelection } from "@/lib/catalog/selection-actions";
import type { SelectionArtist } from "@/lib/catalog/selections";
import { artistSelections } from "@/lib/i18n/fr/artist-selections";
import { catalog } from "@/lib/i18n/fr/catalog";
import { records } from "@/lib/i18n/fr/records";

const fr = { artistSelections, catalog, records };

const secondary = "text-[color:var(--text-secondary)]";

/**
 * The artists of a selection (lot 4 of docs/pds-mic-plan.md), in their
 * order: picture and name (its fiche), relation with PDS, its titles; for
 * who manages the Catalogue, each row's « ⋯ »: « Retirer de la sélection »,
 * at once (it is added back as easily, and its fiche is untouched).
 */
export function SelectionArtistsTable({
  selectionId,
  artists,
  canManage,
}: {
  selectionId: string;
  artists: SelectionArtist[];
  canManage: boolean;
}) {
  const t = fr.artistSelections;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.artists.name}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.artists.relation}</DataTableHead>
        <DataTableHead fill>{t.artists.titles}</DataTableHead>
        {canManage && <DataTableActionsHead label={fr.records.menu.column} />}
      </DataTableHeader>
      <DataTableBody>
        {artists.map((artist) => (
          <DataTableRow key={artist.id}>
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
                  <DataTableLink href={routes.artist(artist.id)}>
                    {artist.name}
                  </DataTableLink>
                }
              />
            </DataTableCell>
            <DataTableCell hideBelow="sm" className={secondary}>
              {fr.catalog.relation.labels[artist.relation]}
            </DataTableCell>
            <DataTableCell fill className="tabular-nums">
              {artist.masterCount}
            </DataTableCell>
            {canManage && (
              <DataTableActionsCell>
                <RemoveAction selectionId={selectionId} artist={artist} />
              </DataTableActionsCell>
            )}
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}

function RemoveAction({
  selectionId,
  artist,
}: {
  selectionId: string;
  artist: SelectionArtist;
}) {
  const t = fr.artistSelections;
  const [, startTransition] = useTransition();
  return (
    <RowActions
      label={t.menu(artist.name)}
      reveal
      actions={[
        {
          key: "remove",
          label: t.remove.action,
          icon: IconXmark,
          onSelect: () =>
            startTransition(async () => {
              const result = await removeArtistFromSelection({
                selectionId,
                artistId: artist.id,
              });
              if (!result.ok) return void toast.error(result.error);
              toast.success(t.remove.done);
            }),
        },
      ]}
    />
  );
}
