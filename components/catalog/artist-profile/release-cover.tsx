import { IconDisc } from "@/components/icons";
import { cn } from "@/lib/utils";

// Square cover from Deezer's CDN, or a disc on grey when there is none.
// Decorative: the title always sits next to it.
export function ReleaseCover({
  coverUrl,
  className,
}: {
  coverUrl: string | null;
  // Sets the size (e.g. `size-12`, `w-full`).
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-sunken)] text-muted-foreground",
        className,
      )}
    >
      <IconDisc className="size-6" />
      {coverUrl && (
        // Plain <img>, as in ArtistAvatar: Deezer's CDN is the only source.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </span>
  );
}
