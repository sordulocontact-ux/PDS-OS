import { ReleaseCard } from "@/components/catalog/artist-profile/release-card";
import { StatTiles, StatTilesSkeleton } from "@/components/ui/stat-tiles";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/lib/auth/redirects";
import { getArtistProfile } from "@/lib/catalog/artist-profile";
import { formatFans } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

// Top of the overview: the catalog's figures, then what Deezer adds (fans,
// releases, latest release and latest album — one card when they are the
// same). Without Deezer, or when it does not answer, the catalog's figures
// stay.
export async function ArtistHighlights({
  artistId,
  deezerId,
  masterCount,
  projectCount,
}: {
  artistId: string;
  deezerId: number | null;
  masterCount: number;
  projectCount: number;
}) {
  const profile = deezerId === null ? null : await getArtistProfile(deezerId);
  const t = fr.catalog.deezerProfile;
  const p = fr.catalog.artistPage;

  const stats = [
    {
      label: p.mastersCount,
      value: String(masterCount),
      href: routes.artistMasters(artistId),
    },
    {
      label: p.projectsCount,
      value: String(projectCount),
      href: routes.artistProjects(artistId),
    },
    ...(profile
      ? [
          { label: p.fansCount, value: formatFans(profile.fans) },
          { label: t.stats.releases, value: String(profile.releases.length) },
        ]
      : []),
  ];
  const latestRelease = profile?.latestRelease ?? null;
  const latestAlbum = profile?.latestAlbum ?? null;

  return (
    <div className="flex flex-col gap-4">
      <StatTiles stats={stats} />
      {deezerId !== null && !profile && (
        <p className="text-sm text-muted-foreground">{t.unavailable}</p>
      )}
      {profile &&
        (latestRelease ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <ReleaseCard label={t.latestRelease} release={latestRelease} />
            {latestAlbum && latestAlbum.id !== latestRelease.id && (
              <ReleaseCard label={t.latestAlbum} release={latestAlbum} />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t.noRelease}</p>
        ))}
    </div>
  );
}

export function ArtistHighlightsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <StatTilesSkeleton />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-[106px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
