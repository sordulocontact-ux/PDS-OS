import { ExternalLink } from "@/components/catalog/artist-profile/external-link";
import { ReleaseCover } from "@/components/catalog/artist-profile/release-cover";
import { formatDuration, type ArtistTopTrack } from "@/lib/catalog/types";

// Deezer's most played tracks, in its order.
export function ArtistTopTracks({ tracks }: { tracks: ArtistTopTrack[] }) {
  return (
    <ol className="divide-y divide-border rounded-xl border border-border">
      {tracks.map((track, index) => (
        <li
          key={track.id}
          className="relative flex items-center gap-3 px-4 py-2.5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] first:rounded-t-xl last:rounded-b-xl hover:bg-[var(--control-bg-hover)]"
        >
          <span className="w-4 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
            {index + 1}
          </span>
          <ReleaseCover
            coverUrl={track.coverUrl}
            className="size-10 rounded-md"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <ExternalLink
              href={track.link}
              cover
              className="truncate text-sm font-medium"
            >
              {track.title}
            </ExternalLink>
            {/* A single's album carries its own title: not repeated. */}
            {track.album !== track.title && (
              <span className="truncate text-caption text-muted-foreground">
                {track.album}
              </span>
            )}
          </div>
          <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {formatDuration(track.durationSeconds)}
          </span>
        </li>
      ))}
    </ol>
  );
}
