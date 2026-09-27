import { ArtistBio } from "@/components/catalog/artist-profile/artist-bio";
import { Skeleton } from "@/components/ui/skeleton";
import { getArtistProfile } from "@/lib/catalog/artist-profile";
import { fr } from "@/lib/i18n/fr";

// Biography read from Deezer (then Wikipedia) when the team wrote none.
export async function ArtistAutoBio({ deezerId }: { deezerId: number }) {
  const profile = await getArtistProfile(deezerId);
  if (!profile?.bio)
    return (
      <p className="text-sm text-muted-foreground">
        {fr.catalog.deezerProfile.bio.none}
      </p>
    );
  return <ArtistBio bio={profile.bio} />;
}

export function ArtistAutoBioSkeleton() {
  return (
    <div className="flex max-w-prose flex-col gap-2" aria-hidden>
      {["w-full", "w-full", "w-2/3"].map((width, i) => (
        <Skeleton key={i} className={`h-4 ${width} rounded`} />
      ))}
    </div>
  );
}
