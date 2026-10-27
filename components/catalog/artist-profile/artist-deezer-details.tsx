import { ArtistDiscography } from "@/components/catalog/artist-profile/artist-discography";
import { ArtistTopTracks } from "@/components/catalog/artist-profile/artist-top-tracks";
import { RelatedArtists } from "@/components/catalog/artist-profile/related-artists";
import { PageSection } from "@/components/shell/page-section";
import { Skeleton } from "@/components/ui/skeleton";
import { getArtistProfile } from "@/lib/catalog/artist-profile";
import { catalog } from "@/lib/i18n/fr/catalog";

const fr = { catalog };

// Discography tab: every release, top tracks and similar artists.
export async function ArtistDeezerDetails({ deezerId }: { deezerId: number }) {
  const profile = await getArtistProfile(deezerId);
  const t = fr.catalog.deezerProfile;
  if (!profile)
    return <p className="text-sm text-muted-foreground">{t.unavailable}</p>;

  return (
    <>
      {profile.releases.length > 0 && (
        <PageSection id="discography" title={t.discography.title}>
          <ArtistDiscography releases={profile.releases} />
        </PageSection>
      )}
      {profile.topTracks.length > 0 && (
        <PageSection id="top-tracks" title={t.topTracks}>
          <ArtistTopTracks tracks={profile.topTracks} />
        </PageSection>
      )}
      {profile.related.length > 0 && (
        <PageSection id="related" title={t.related}>
          <RelatedArtists artists={profile.related} />
        </PageSection>
      )}
    </>
  );
}

export function ArtistDeezerDetailsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-5 w-32 rounded" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  );
}
