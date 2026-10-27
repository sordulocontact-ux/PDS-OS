import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { ExternalLink } from "@/components/catalog/artist-profile/external-link";
import { routes } from "@/lib/auth/redirects";
import type { RelatedArtist } from "@/lib/catalog/artist-types";
import { formatFans } from "@/lib/catalog/types";
import { catalog } from "@/lib/i18n/fr/catalog";

const fr = { catalog };

// Similar artists according to Deezer. One already in the catalog opens its
// page here; the others open Deezer.
export function RelatedArtists({ artists }: { artists: RelatedArtist[] }) {
  const t = fr.catalog.deezerProfile;
  const linkClass =
    "truncate text-sm font-medium outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {artists.map((artist) => (
        <li
          key={artist.deezerId}
          className="relative flex items-center gap-3 rounded-xl p-2 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--control-bg-hover)]"
        >
          <Avatar
            name={artist.name}
            pictureUrl={artist.pictureUrl}
            className="size-12"
          />
          <div className="flex min-w-0 flex-col">
            {artist.existing ? (
              <Link
                href={routes.artist(artist.existing.id)}
                className={linkClass}
              >
                {artist.name}
              </Link>
            ) : (
              <ExternalLink
                href={artist.link}
                cover
                className="truncate text-sm font-medium"
              >
                {artist.name}
              </ExternalLink>
            )}
            <span className="truncate text-caption text-muted-foreground">
              {artist.existing ? t.inCatalog : t.fans(formatFans(artist.fans))}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
