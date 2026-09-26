import { IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { MastersTable } from "@/components/catalog/masters-table";
import { IconDisc } from "@/components/icons";
import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getArtist } from "@/lib/catalog/artist-queries";
import { listMasters } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";

// Masters tab: every live master crediting the artist, in the same table
// as the Masters page (ISRC, release, date, status).
export default async function ArtistMastersPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]/masters">) {
  const access = await requireApproved();
  const { artistId } = await params;
  const artist = await getArtist(artistId);
  if (!artist) notFound();
  const { masters, error } = await listMasters({
    ids: artist.masters.map((m) => m.id),
  });
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
              <IconPlus aria-hidden data-icon="inline-start" />
              {t.newMaster}
            </Link>
          ) : null
        }
      />
    );
  }
  return <MastersTable masters={masters} />;
}
