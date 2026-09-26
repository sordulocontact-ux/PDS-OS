"use client";

import { useState } from "react";

import { ExternalLink } from "@/components/catalog/artist-profile/external-link";
import { ReleaseCover } from "@/components/catalog/artist-profile/release-cover";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { StatusBadge } from "@/components/ui/status-badge";
import { releaseMeta } from "@/lib/catalog/release-meta";
import {
  RELEASE_KINDS,
  type ArtistRelease,
  type ReleaseKind,
} from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { upcomingReleaseTone } from "@/lib/ui/state-tones";

// Enough covers for three rows on a wide screen before "Tout afficher".
const COLLAPSED = 12;

// Every Deezer release, newest first, filterable by kind (only the kinds
// the artist has are offered).
export function ArtistDiscography({ releases }: { releases: ArtistRelease[] }) {
  const t = fr.catalog.deezerProfile;
  const [kind, setKind] = useState<ReleaseKind | null>(null);
  const [expanded, setExpanded] = useState(false);

  const counts = RELEASE_KINDS.map((k) => ({
    kind: k,
    count: releases.filter((r) => r.kind === k).length,
  })).filter((c) => c.count > 0);
  const filtered = kind ? releases.filter((r) => r.kind === kind) : releases;
  const shown = expanded ? filtered : filtered.slice(0, COLLAPSED);

  function choose(next: ReleaseKind | null) {
    setKind(next);
    setExpanded(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {counts.length > 1 && (
        <div
          role="group"
          aria-label={t.discography.filtersLabel}
          className="flex flex-wrap gap-2"
        >
          <FilterChip pressed={kind === null} onClick={() => choose(null)}>
            {t.discography.all}
            <span className="tabular-nums opacity-60">{releases.length}</span>
          </FilterChip>
          {counts.map((c) => (
            <FilterChip
              key={c.kind}
              pressed={kind === c.kind}
              onClick={() => choose(c.kind)}
            >
              {t.kindsPlural[c.kind]}
              <span className="tabular-nums opacity-60">{c.count}</span>
            </FilterChip>
          ))}
        </div>
      )}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((release) => (
          <li
            key={release.id}
            className="group relative flex flex-col gap-2 rounded-lg"
          >
            <ReleaseCover
              coverUrl={release.coverUrl}
              className="w-full transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-standard)] group-hover:opacity-85"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <ExternalLink
                href={release.link}
                cover
                className="line-clamp-2 text-sm font-medium group-hover:underline"
              >
                {release.title}
              </ExternalLink>
              <p className="text-caption text-muted-foreground">
                {releaseMeta(release)}
              </p>
              {release.upcoming && (
                <StatusBadge
                  tone={upcomingReleaseTone}
                  size="sm"
                  className="w-fit"
                >
                  {t.discography.upcoming}
                </StatusBadge>
              )}
            </div>
          </li>
        ))}
      </ul>
      {filtered.length > COLLAPSED && (
        <Button
          variant="outline"
          className="w-fit"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded
            ? t.discography.showLess
            : t.discography.showAll(filtered.length)}
        </Button>
      )}
    </div>
  );
}
