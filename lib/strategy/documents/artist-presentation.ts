// An artist's presentation, written by code from the artist sheet only
// (lib/catalog): the bio as kept on the sheet (typed, else Deezer, else
// Wikipédia) and the facts known about the artist. Used by the Dossier de
// presse; kept on its own so that the artist sheet can expose it later as a
// reusable Artist Deck / Kit Artiste (ticket Stratégie § 12). Client-safe.

import { strategyPressKit } from "@/lib/i18n/fr/strategy-press-kit";

const fr = { strategyPressKit };

export type ArtistSheet = {
  name: string;
  // Paragraphs separated by blank lines.
  bio: { text: string; source: "manual" | "deezer" | "wikipedia" } | null;
  countryCode: string | null;
  deezerUrl: string | null;
};

export type ArtistPresentation = {
  title: string;
  // Null when the sheet has no bio: the dossier says it is missing.
  text: string | null;
  source: NonNullable<ArtistSheet["bio"]>["source"] | null;
  facts: Array<{ label: string; value: string }>;
};

const countries = (() => {
  try {
    return new Intl.DisplayNames(["fr"], { type: "region" });
  } catch {
    return null;
  }
})();

export function artistPresentation(artist: ArtistSheet): ArtistPresentation {
  const t = fr.strategyPressKit.document;
  const country =
    artist.countryCode && /^[A-Z]{2}$/.test(artist.countryCode)
      ? (countries?.of(artist.countryCode) ?? artist.countryCode)
      : null;
  return {
    title: artist.name,
    text: artist.bio?.text.trim() || null,
    source: artist.bio?.source ?? null,
    facts: [
      { label: t.artist, value: artist.name },
      ...(country ? [{ label: t.country, value: country }] : []),
    ],
  };
}
