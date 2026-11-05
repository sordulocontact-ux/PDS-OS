import { notFound } from "next/navigation";

import { SessionsView } from "@/components/sessions/sessions-view";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getArtist } from "@/lib/catalog/artist-queries";
import { fr } from "@/lib/i18n/fr";
import { listStudioSessions } from "@/lib/sessions/queries";
import { sessionViewOf } from "@/lib/sessions/types";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.catalog.artistPage.tabs.sessions };

// The artist's studio sessions: linked to the artist, or to one of its
// titles. « Nouvelle session » with the artist already chosen.
export default async function ArtistSessionsPage({
  params,
  searchParams,
}: PageProps<"/app/catalog/artists/[artistId]/sessions">) {
  const { artistId } = await params;
  const [access, artist, { sessions, error }, query] = await allInOrder([
    requireApproved(),
    getArtist(artistId),
    listStudioSessions({ artistId }),
    searchParams,
  ]);
  if (!artist) notFound();
  return (
    <SessionsView
      rows={sessions}
      error={error}
      view={sessionViewOf(query.vue)}
      path={routes.artistSessions(artist.id)}
      canCreate={can(access, "manage_sessions")}
      scope={{ artistId: artist.id }}
    />
  );
}
