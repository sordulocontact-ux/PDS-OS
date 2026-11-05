import { IconDisc } from "@/components/icons";
import { Thumbnail } from "@/components/ui/thumbnail";

// Square cover (Deezer's CDN for an artist's releases, a signed URL of the
// title's own cover in the Catalogue), or a disc on grey when there is none.
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
    <Thumbnail
      src={coverUrl}
      icon={IconDisc}
      className={className}
      iconClassName="size-6"
    />
  );
}
