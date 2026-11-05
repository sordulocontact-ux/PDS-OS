import { IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { MastersTable } from "@/components/catalog/masters-table";
import { IconDisc } from "@/components/icons";
import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getArtist } from "@/lib/catalog/artist-queries";
import { listMasterCoverThumbs } from "@/lib/catalog/covers";
import { listMasters } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.catalog.artistPage.tabs.masters };

// Masters tab: every live master crediting the artist, in the same table
// as the Masters page (ISRC, release, date, status).
export default async function ArtistMastersPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]/masters">) {
  const { artistId } = await params;
  const [access, artist] = await allInOrder([
    requireApproved(),
    getArtist(artistId),
  ]);
  if (!artist) notFound();
  const [{ masters, error }, covers] = await allInOrder([
    listMasters({ ids: artist.masters.map((m) => m.id) }),
    listMasterCoverThumbs(),
  ]);
  const t = fr.catalog.artist;

  if (error) {
    return (
      <FormMessage kind="error">{fr.catalog.artistPage.loadError}</FormMessage>
    );
  }
  if (masters.length === 0) {
    return (
      <EmptyState
        icon={IconDisc}
        title={t.masters}
        body={t.noMasters}
        action={
          can(access, "manage_catalog") ? (
            <Link
              href={routes.mastersNewForArtist(artist.id)}
              className={buttonVariants({ size: "lg" })}
            >
              <ButtonRoll>
                <IconPlus aria-hidden data-icon="inline-start" />
                {t.newMaster}
              </ButtonRoll>
            </Link>
          ) : null
        }
      />
    );
  }
  return (
    <MastersTable
      masters={masters}
      covers={covers}
      rights={{
        canEdit: can(access, "manage_catalog"),
        canArchive: can(access, "archive_records"),
        archived: false,
      }}
    />
  );
}
