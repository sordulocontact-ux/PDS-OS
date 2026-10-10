import "server-only";

import type {
  CaptureArtist,
  SocialLink,
  SocialSource,
} from "@/lib/catalog/capture-artist-types";
import type { Matched, Person } from "@/lib/catalog/capture-person";
import { linktreeSlug } from "@/lib/catalog/capture-text";
import {
  instagramUrl,
  socialsOfDeezerArtist,
  spotifyUrl,
  tiktokProfile,
  tiktokUrl,
  type SocialHandles,
} from "@/lib/integrations/artist-socials";
import { linktreeSocials } from "@/lib/integrations/linktree";

/**
 * TikTok, Instagram and Spotify of a person read on a screenshot (Labo),
 * first source that knows wins: the screenshot itself (TikTok handle
 * confirmed by TikTok, Instagram written in the bio), the artist's own
 * Linktree, then what MusicBrainz or Wikidata link to the Deezer profile.
 */

type Network = keyof SocialHandles;

/**
 * The handle read on the screenshot, asked to TikTok before the Deezer
 * search: a handle TikTok does not know is dropped (misread); the display
 * name TikTok answers joins the names (a video shows only the handle).
 */
export async function confirmTikTok(person: Person): Promise<Person> {
  const handle = person.read.tiktok;
  if (!handle) return person;
  const profile = await tiktokProfile(handle);
  if (profile === null) return person;
  if (profile === undefined)
    return { ...person, tiktok: handleLink("tiktok", handle, "capture") };
  const known = person.names.some(
    (n) => n.toLowerCase() === profile.displayName.toLowerCase(),
  );
  return {
    ...person,
    names:
      known || !profile.displayName
        ? person.names
        : [...person.names, profile.displayName],
    tiktok: handleLink("tiktok", profile.handle, "tiktok"),
  };
}

export async function withSocials(person: Matched): Promise<CaptureArtist> {
  const { read, links } = person;
  // What the browser gets: search names, clues and links stay here.
  const artist = {
    names: person.names,
    artistName: person.artistName,
    role: person.role,
    reasoning: person.reasoning,
    tiktok: person.tiktok,
    status: person.status,
    account: person.account,
    others: person.others,
  };
  const name = artist.account?.name ?? artist.artistName;
  const link = (network: Network, value: string, source: SocialSource) =>
    network === "spotify"
      ? { label: name, url: spotifyUrl(value), source }
      : handleLink(network, value, source);

  const found: Record<Network, SocialLink | null> = {
    tiktok: artist.tiktok,
    instagram: read.instagram
      ? link("instagram", read.instagram, "capture")
      : null,
    spotify: null,
  };
  const fill = (handles: SocialHandles | null, source: SocialSource) => {
    for (const network of ["tiktok", "instagram", "spotify"] as const) {
      const value = handles?.[network];
      if (!found[network] && value)
        found[network] = link(network, value, source);
    }
  };
  const complete = () => Object.values(found).every(Boolean);

  // The artist's own Linktree, when the screenshot shows it in full.
  const slug = linktreeSlug(links);
  if (slug && !complete())
    fill(await linktreeSocials(slug).catch(() => null), "linktree");

  // Only for an account the code is fairly sure of: never for homonyms.
  const sure =
    artist.account &&
    (artist.status === "linked" || artist.status === "single");
  if (sure && !complete()) {
    const linked = await socialsOfDeezerArtist(artist.account!.deezerId);
    for (const network of ["tiktok", "instagram", "spotify"] as const) {
      const value = linked[network];
      if (!found[network] && value)
        found[network] = link(network, value.handle, value.source);
    }
  }
  return { ...artist, ...found };
}

function handleLink(
  network: "tiktok" | "instagram",
  handle: string,
  source: SocialSource,
): SocialLink {
  return {
    label: `@${handle}`,
    url: network === "tiktok" ? tiktokUrl(handle) : instagramUrl(handle),
    source,
  };
}
