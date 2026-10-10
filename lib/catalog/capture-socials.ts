import "server-only";

import type {
  CaptureArtist,
  SocialLink,
  SocialSource,
} from "@/lib/catalog/capture-artist-types";
import type { Matched, Person } from "@/lib/catalog/capture-artists";
import {
  instagramUrl,
  socialsOfDeezerArtist,
  tiktokProfile,
  tiktokUrl,
} from "@/lib/integrations/artist-socials";

/**
 * TikTok and Instagram of a person read on a screenshot (Labo). Decided by
 * the code: the handle read on the screenshot, confirmed by TikTok; then the
 * accounts MusicBrainz or Wikidata link to the Deezer profile found.
 */

const link = (
  network: "tiktok" | "instagram",
  handle: string,
  source: SocialSource,
): SocialLink => ({
  handle,
  url: network === "tiktok" ? tiktokUrl(handle) : instagramUrl(handle),
  source,
});

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
    return { ...person, tiktok: link("tiktok", handle, "capture") };
  const known = person.names.some(
    (n) => n.toLowerCase() === profile.displayName.toLowerCase(),
  );
  return {
    ...person,
    names:
      known || !profile.displayName
        ? person.names
        : [...person.names, profile.displayName],
    tiktok: link("tiktok", profile.handle, "tiktok"),
  };
}

// Only for an account the code is fairly sure of: never for homonyms.
export async function withSocials(person: Matched): Promise<CaptureArtist> {
  const { read, ...artist } = person;
  const readInstagram = read.instagram
    ? link("instagram", read.instagram, "capture")
    : null;
  const sure =
    artist.account &&
    (artist.status === "linked" || artist.status === "single");
  if (!sure || (artist.tiktok && readInstagram))
    return { ...artist, instagram: readInstagram };

  const found = await socialsOfDeezerArtist(artist.account!.deezerId);
  return {
    ...artist,
    tiktok:
      artist.tiktok ??
      (found.tiktok
        ? link("tiktok", found.tiktok.handle, found.tiktok.source)
        : null),
    instagram:
      readInstagram ??
      (found.instagram
        ? link("instagram", found.instagram.handle, found.instagram.source)
        : null),
  };
}
