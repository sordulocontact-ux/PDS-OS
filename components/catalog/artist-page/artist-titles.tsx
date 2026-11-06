import { IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { TitleAudioState } from "@/components/catalog/title/title-audio-state";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
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
import { variantText } from "@/lib/catalog/title-rules";
import type { MasterRow } from "@/lib/catalog/types";
import { catalog } from "@/lib/i18n/fr/catalog";

const fr = { catalog };

/**
 * « Titres » of the artist's overview (proto `docs/protos/pages.html`): the
 * titles crediting the artist, the projects holding each, its audio state;
 * « Nouveau titre » for the catalog's managers.
 */
export function ArtistTitles({
  artistId,
  masters,
  error,
  canEdit,
}: {
  artistId: string;
  masters: MasterRow[];
  error: boolean;
  canEdit: boolean;
}) {
  const t = fr.catalog.artistPage.titles;
  return (
    <PageSection
      card
      id="titles"
      title={t.title}
      description={t.description}
      action={
        canEdit && (
          <Link
            href={routes.mastersNewForArtist(artistId)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ButtonRoll>
              <IconPlus aria-hidden data-icon="inline-start" />
              {fr.catalog.artist.newMaster}
            </ButtonRoll>
          </Link>
        )
      }
    >
      {error ? (
        <FormMessage kind="error">
          {fr.catalog.artistPage.loadError}
        </FormMessage>
      ) : masters.length === 0 ? (
        <EmptyNote>{fr.catalog.artist.noMasters}</EmptyNote>
      ) : (
        <DataTable framed>
          <DataTableHeader>
            <DataTableHead>{t.columns.title}</DataTableHead>
            <DataTableHead hideBelow="sm">{t.columns.audio}</DataTableHead>
            <DataTableHead fill>{t.columns.projects}</DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {masters.map((m) => (
              <DataTableRow key={m.id}>
                <DataTableCell>
                  <DataTableMedia
                    title={
                      <DataTableLink href={routes.master(m.id)}>
                        {m.title}
                      </DataTableLink>
                    }
                    subtitle={variantText(m)}
                  />
                </DataTableCell>
                <DataTableCell hideBelow="sm">
                  <TitleAudioState
                    state={m.audioState}
                    validated={m.finalValidatedAt !== null}
                  />
                </DataTableCell>
                <DataTableCell fill className="break-words">
                  {m.projects.map((p) => p.title).join(", ") || EMPTY_CELL}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </PageSection>
  );
}
