"use client";

import { useState } from "react";

import { ExternalLink } from "@/components/catalog/artist-profile/external-link";
import { Button } from "@/components/ui/button";
import type { ArtistBio as Bio } from "@/lib/catalog/artist-types";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// About four lines of text at the page width.
const COLLAPSED_CHARS = 400;

// Biography as plain text: a few lines of the first paragraph, the rest on
// demand, then its source (Wikipedia content must be credited and linked).
export function ArtistBio({ bio }: { bio: Bio }) {
  const [expanded, setExpanded] = useState(false);
  const t = fr.catalog.deezerProfile.bio;
  const paragraphs = bio.text.split(/\n{2,}/);
  // Deezer often sends a single long paragraph: length counts too.
  const collapsible =
    paragraphs.length > 1 || bio.text.length > COLLAPSED_CHARS;
  const collapsed = collapsible && !expanded;
  const shown = collapsed ? paragraphs.slice(0, 1) : paragraphs;

  return (
    <div className="flex flex-col gap-3">
      <div
        lang={bio.lang}
        id="artist-bio-text"
        className="flex max-w-prose flex-col gap-3 text-sm whitespace-pre-line text-ink-800"
      >
        {shown.map((paragraph, i) => (
          <p key={i} className={cn(collapsed && "line-clamp-4")}>
            {paragraph}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {collapsible && (
          <Button
            variant="link"
            size="xs"
            className="px-0"
            aria-expanded={expanded}
            aria-controls="artist-bio-text"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? t.less : t.more}
          </Button>
        )}
        <p className="text-caption text-muted-foreground">
          {bio.source === "wikipedia" && bio.url ? (
            <ExternalLink href={bio.url} icon className="hover:text-foreground">
              {t.fromWikipedia(bio.lang)}
            </ExternalLink>
          ) : bio.source === "manual" ? (
            fr.catalog.artistPage.bioManual
          ) : (
            t.fromDeezer(bio.author)
          )}
        </p>
      </div>
    </div>
  );
}
