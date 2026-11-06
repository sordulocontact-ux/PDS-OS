import "server-only";

import type {
  ActivityRole,
  CaptureActivity,
  CaptureArtist,
  SocialLink,
  SocialSource,
} from "@/lib/catalog/capture-artist-types";
import type { Matched, Person } from "@/lib/catalog/capture-person";
import { artistPicture } from "@/lib/catalog/capture-picture";
import {
  captureKey as key,
  linkClues,
  linktreeSlug,
} from "@/lib/catalog/capture-text";
import {
  instagramUrl,
  socialsOfDeezerArtist,
  spotifyUrl,
  tiktokProfile,
  tiktokUrl,
  type SocialHandles,
} from "@/lib/integrations/artist-socials";
import { readInstagramProfile } from "@/lib/integrations/instagram-profile";
import { linktreeSocials } from "@/lib/integrations/linktree";
import { readTikTokProfile } from "@/lib/integrations/tiktok-profile";
import { asHandle } from "@/lib/network/socials";
import { emailsIn } from "@/lib/utils/email";

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
 * name TikTok answers joins the names (a video shows only the handle). Its
 * public page also gives the bio, the bio link and the audience: the link is
 * one more clue for Deezer, the bio may hold an e-mail or an Instagram.
 * When the page cannot be read, the official oEmbed still confirms it.
 */
export async function confirmTikTok(person: Person): Promise<Person> {
  const handle = person.read.tiktok;
  if (!handle) return person;
  const page = await readTikTokProfile(handle);
  const profile =
    page === undefined
      ? await tiktokProfile(handle)
      : page && { handle: page.handle, displayName: page.displayName };
  if (profile === null) return person;
  if (profile === undefined)
    return { ...person, tiktok: handleLink("tiktok", handle, person.readFrom) };
  const known = person.names.some(
    (n) => n.toLowerCase() === profile.displayName.toLowerCase(),
  );
  const bioLink = page?.bioLink;
  return {
    ...person,
    names:
      known || !profile.displayName
        ? person.names
        : [...person.names, profile.displayName],
    tiktok: handleLink("tiktok", profile.handle, "tiktok"),
    profile: page
      ? {
          displayName: page.displayName,
          bio: page.bio,
          bioLink: page.bioLink,
          followers: page.followers,
          videos: page.videos,
          verified: page.verified,
        }
      : null,
    picture: page?.avatar
      ? { url: page.avatar, source: "tiktok" }
      : person.picture,
    links: bioLink ? [...person.links, bioLink] : person.links,
    clues: bioLink
      ? [...new Set([...person.clues, ...linkClues([bioLink])])]
      : person.clues,
    bioInstagram: instagramInBio(page?.bio ?? ""),
    email:
      person.email ??
      (page && emailsIn(page.bio)[0]
        ? { value: emailsIn(page.bio)[0], source: "tiktok" }
        : null),
  };
}

/**
 * The Instagram read on the screenshot, in a shared link or in the TikTok
 * bio, asked to Instagram when TikTok gave no picture: its public page gives
 * the profile picture and the name shown, which joins the names (a link
 * gives only the handle: « Theodora Miss KITOKO » behind @theodorabosslady).
 * A page that cannot be read changes nothing.
 */
export async function confirmInstagram(person: Person): Promise<Person> {
  const handle = person.read.instagram ?? person.bioInstagram;
  if (!handle || person.picture) return person;
  const page = await readInstagramProfile(handle);
  if (!page) return person;
  const name = page.displayName;
  const known = !name || person.names.some((n) => key(n) === key(name));
  return {
    ...person,
    names: known ? person.names : [...person.names, name],
    picture: page.pictureUrl
      ? { url: page.pictureUrl, source: "instagram" }
      : null,
  };
}

// "Ig: theodorabosslady", "insta @x", "instagram : x" in a bio; a word
// after "IG" without ":" or "@" is not taken for a handle.
const INSTAGRAM_IN_BIO =
  /\b(?:ig|insta(?:gram)?)\s*(?:[:：\-]\s*@?|@)([A-Za-z0-9._]{2,30})/i;

function instagramInBio(bio: string): string | null {
  return asHandle(INSTAGRAM_IN_BIO.exec(bio)?.[1]);
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
    suggestion: person.suggestion,
    profile: person.profile,
    activity: activityOf(person),
    // Looked up afterwards, with the viewer's session.
    contact: null,
  };
  let email = person.email;
  const name = artist.account?.name ?? artist.artistName;
  const link = (network: Network, value: string, source: SocialSource) =>
    network === "spotify"
      ? { label: name, url: spotifyUrl(value), source }
      : handleLink(network, value, source);

  const found: Record<Network, SocialLink | null> = {
    tiktok: artist.tiktok,
    instagram: read.instagram
      ? link("instagram", read.instagram, person.readFrom)
      : person.bioInstagram
        ? link("instagram", person.bioInstagram, "bio")
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
  if (slug && (!complete() || !email)) {
    const linktree = await linktreeSocials(slug).catch(() => null);
    fill(linktree, "linktree");
    if (!email && linktree?.email)
      email = { value: linktree.email, source: "linktree" };
  }

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
  const picture = await artistPicture(
    found.spotify,
    sure ? artist.account!.pictureUrl : null,
    person.picture,
  );
  return { ...artist, ...found, email, picture };
}

// Words that say "beatmaker", read by the code in the bio or on the
// screenshot (for the account), before PO's reading.
const BEATMAKER =
  /\b(beat\s?-?maker|beatmaking|type\s?beats?|beats?\s?(?:dispo|for\s?sale|à\s?vendre)|instrus?|prod(?:uct(?:eur|er|rice))?\b\.?|fl\s?studio)(?![a-zà-ÿ])/i;

function activityOf(person: Matched): CaptureActivity {
  const bio = person.profile?.bio ?? "";
  const inBio = BEATMAKER.exec(bio)?.[1];
  const onCapture =
    person.role === "account" ? BEATMAKER.exec(person.writtenText)?.[1] : null;
  const clue = inBio
    ? { text: inBio, source: "tiktok" as const }
    : onCapture
      ? { text: onCapture, source: "capture" as const }
      : null;
  const po = person.activity;
  const beatmaker = !!clue || po === "beatmaker" || po === "both";
  // Nothing said either way: an artist.
  const artist =
    po === "artist" || po === "both" || (po === "unknown" && !beatmaker);
  const roles: ActivityRole[] = [
    ...(artist ? (["artist"] as const) : []),
    ...(beatmaker ? (["beatmaker"] as const) : []),
  ];
  return { roles, clue };
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
