import { ExternalLink } from "@/components/catalog/artist-profile/external-link";
import { ReleaseCover } from "@/components/catalog/artist-profile/release-cover";
import { releaseMeta } from "@/lib/catalog/release-meta";
import type { ArtistRelease } from "@/lib/catalog/artist-types";

// Highlighted release (latest release, latest album): grey label, cover,
// title and "Single · 14 nov. 2025". The whole card opens Deezer.
export function ReleaseCard({
  label,
  release,
}: {
  label: string;
  release: ArtistRelease;
}) {
  return (
    <article className="relative flex items-center gap-4 rounded-2xl border border-border bg-card p-3 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--control-bg-hover)]">
      <ReleaseCover coverUrl={release.coverUrl} className="size-20" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-caption text-grey-400">{label}</p>
        <ExternalLink
          href={release.link}
          cover
          className="line-clamp-2 text-body-md font-semibold text-foreground"
        >
          {release.title}
        </ExternalLink>
        <p className="text-caption text-muted-foreground">
          {releaseMeta(release)}
        </p>
      </div>
    </article>
  );
}
