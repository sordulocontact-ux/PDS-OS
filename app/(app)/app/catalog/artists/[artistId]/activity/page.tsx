import { IconOrderedList } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { ArtistActivity } from "@/components/catalog/artist-page/activity/artist-activity";
import { EmptyState } from "@/components/shell/empty-state";
import { requireApproved } from "@/lib/auth/dal";
import { listArtistActivity } from "@/lib/catalog/activity";
import { getArtist } from "@/lib/catalog/artist-queries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.catalog.artistPage.tabs.activity };

const LIMIT = 200;

// Activity tab: what happened around the artist, written by the database
// (triggers), filtered by RLS (contacts and contracts: manage_catalog;
// project events: those who see the project).
export default async function ArtistActivityPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]/activity">) {
  const { artistId } = await params;
  const [, artist, { events, error }] = await allInOrder([
    requireApproved(),
    getArtist(artistId),
    listArtistActivity(artistId),
  ]);
  if (!artist) notFound();
  const t = fr.artistActivity;

  if (error) return <FormMessage kind="error">{t.loadError}</FormMessage>;
  if (events.length === 0) {
    return (
      <EmptyState
        icon={IconOrderedList}
        title={t.emptyTitle}
        body={t.emptyBody}
      />
    );
  }
  return (
    <ArtistActivity
      events={events}
      now={new Date()}
      truncated={events.length >= LIMIT}
    />
  );
}
