import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  ArtistDeezerDetails,
  ArtistDeezerDetailsSkeleton,
} from "@/components/catalog/artist-profile/artist-deezer-details";
import { requireApproved } from "@/lib/auth/dal";
import { getArtist } from "@/lib/catalog/artist-queries";
import { fr } from "@/lib/i18n/fr";

export const metadata = { title: fr.catalog.artistPage.tabs.discography };

// Discography tab: what Deezer lists for the artist, streamed in.
export default async function ArtistDiscographyPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]/discography">) {
  await requireApproved();
  const { artistId } = await params;
  const artist = await getArtist(artistId);
  if (!artist || artist.deezerId === null) notFound();

  return (
    <Suspense fallback={<ArtistDeezerDetailsSkeleton />}>
      <ArtistDeezerDetails deezerId={artist.deezerId} />
    </Suspense>
  );
}
