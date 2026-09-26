import { ReleaseCard } from "@/components/catalog/artist-profile/release-card";
import { getArtistProfile } from "@/lib/catalog/artist-profile";
import { formatFans } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

// Top of the artist page, read live from Deezer: key figures, then the
// latest release and the latest album (one card when they are the same).
export async function ArtistHighlights({ deezerId }: { deezerId: number }) {
  const profile = await getArtistProfile(deezerId);
  const t = fr.catalog.deezerProfile;
  if (!profile)
    return <p className="text-sm text-muted-foreground">{t.unavailable}</p>;

  const stats = [
    { label: t.stats.fans, value: formatFans(profile.fans) },
    { label: t.stats.releases, value: String(profile.releases.length) },
    {
      label: t.stats.albums,
      value: String(profile.releases.filter((r) => r.kind === "album").length),
    },
  ];
  const { latestRelease, latestAlbum } = profile;

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col-reverse gap-1 rounded-2xl border border-border p-3"
          >
            <dt className="text-caption text-grey-400">{stat.label}</dt>
            <dd className="text-body-xl font-medium tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
      {latestRelease ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <ReleaseCard label={t.latestRelease} release={latestRelease} />
          {latestAlbum && latestAlbum.id !== latestRelease.id && (
            <ReleaseCard label={t.latestAlbum} release={latestAlbum} />
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t.noRelease}</p>
      )}
    </div>
  );
}

export function ArtistHighlightsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[74px] animate-pulse rounded-2xl bg-muted"
          />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-[106px] animate-pulse rounded-2xl bg-muted"
          />
        ))}
      </div>
    </div>
  );
}
