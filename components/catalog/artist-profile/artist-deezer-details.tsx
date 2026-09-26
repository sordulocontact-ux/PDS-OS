import { ArtistBio } from "@/components/catalog/artist-profile/artist-bio";
import { ArtistDiscography } from "@/components/catalog/artist-profile/artist-discography";
import { ArtistTopTracks } from "@/components/catalog/artist-profile/artist-top-tracks";
import { RelatedArtists } from "@/components/catalog/artist-profile/related-artists";
import { PageSection } from "@/components/shell/page-section";
import { getArtistProfile } from "@/lib/catalog/artist-profile";
import { fr } from "@/lib/i18n/fr";

// Biography, discography, top tracks and similar artists. Renders nothing
// when Deezer does not answer: ArtistHighlights already says so.
export async function ArtistDeezerDetails({ deezerId }: { deezerId: number }) {
  const profile = await getArtistProfile(deezerId);
  if (!profile) return null;
  const t = fr.catalog.deezerProfile;

  return (
    <>
      {profile.bio && (
        <PageSection id="bio" title={t.bio.title}>
          <ArtistBio bio={profile.bio} />
        </PageSection>
      )}
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
      <div className="h-5 w-32 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    </div>
  );
}
