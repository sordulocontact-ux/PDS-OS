"use client";

import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { ArtistAvatar } from "@/components/catalog/artist-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import {
  formatFans,
  type ArtistOption,
  type DeezerArtistResult,
} from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

const ROW =
  "flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left no-underline outline-none transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--control-bg-hover)] focus-visible:bg-[var(--control-bg-hover)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground";

// One Deezer result: picture, name, fans; flagged when already in the catalog.
export function DeezerArtistRow({
  artist,
  pickerMode,
  onChoose,
  onExisting,
}: {
  artist: DeezerArtistResult;
  pickerMode: boolean;
  onChoose: (artist: DeezerArtistResult) => void;
  onExisting: (artist: ArtistOption) => void;
}) {
  const t = fr.catalog.artistForm.deezer;
  const content = (
    <>
      <ArtistAvatar
        name={artist.name}
        pictureUrl={artist.pictureUrl}
        className="size-10"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{artist.name}</span>
        <span className="text-xs text-muted-foreground">
          {t.fans(formatFans(artist.fans))}
        </span>
      </span>
      {artist.existing ? (
        <StatusBadge size="sm">{t.inCatalog}</StatusBadge>
      ) : (
        <ChevronRightIcon
          className="size-4 text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden
        />
      )}
    </>
  );

  const { existing } = artist;
  if (!existing) {
    return (
      <button type="button" className={ROW} onClick={() => onChoose(artist)}>
        {content}
      </button>
    );
  }
  // Already in the catalog: hand it back to the picker, or open its page.
  return pickerMode ? (
    <button type="button" className={ROW} onClick={() => onExisting(existing)}>
      {content}
    </button>
  ) : (
    <Link href={routes.artist(existing.id)} className={ROW}>
      {content}
    </Link>
  );
}
