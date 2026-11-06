import "server-only";

import { CAPTURE_READING_INSTRUCTIONS } from "@/lib/ai/instructions/capture-reading";
import { extractFromImage } from "@/lib/ai/llm";
import {
  captureReadingSchema,
  type CaptureReading,
} from "@/lib/ai/schemas/capture-reading";
import type {
  CaptureArtist,
  CaptureArtistsResult,
} from "@/lib/catalog/capture-artist-types";
import { matchOnDeezer } from "@/lib/catalog/capture-deezer";
import { withProofs } from "@/lib/catalog/capture-proofs";
import type { Person } from "@/lib/catalog/capture-person";
import {
  confirmInstagram,
  confirmTikTok,
  withSocials,
} from "@/lib/catalog/capture-socials";
import {
  captureKey as key,
  linkClues,
  piecesOf,
} from "@/lib/catalog/capture-text";
import { findArtistsByDeezerIds } from "@/lib/catalog/queries";
import { findContactsByAccounts } from "@/lib/network/queries";
import { asHandle } from "@/lib/network/socials";
import { emailsIn } from "@/lib/utils/email";

/**
 * A TikTok screenshot → the artists on it, their Deezer account and their
 * networks (Labo, docs/ARCHITECTURE.md § 10 bis). The model reads the image,
 * groups the names by person and proposes the artist names hidden in them;
 * everything else is code: a name is kept only if it is written in the text
 * the model read, a proposed name only if it is a piece of a written one.
 */

// A person has a handful of names; a screenshot, a handful of people.
const MAX_PEOPLE = 6;
const MAX_NAMES = 4;
const MAX_SEARCH_NAMES = 3;

export async function readCaptureArtists(image: {
  data: Uint8Array;
  mediaType: string;
}): Promise<CaptureArtistsResult> {
  const reading = await extractFromImage(
    captureReadingSchema,
    image,
    CAPTURE_READING_INSTRUCTIONS,
  );
  const artists = await findArtists(checkedPeople(reading.output));
  return {
    isTikTok: reading.output.isTikTok,
    analysis: reading.output.analysis,
    artists,
    model: reading.model,
    durationMs: reading.durationMs,
  };
}

/**
 * People read on a screenshot or in a shared link → their TikTok profile,
 * Deezer account, proofs and networks, flagged when already known.
 */
export async function findArtists(people: Person[]): Promise<CaptureArtist[]> {
  return matchPeople(await Promise.all(people.map(confirmAccounts)));
}

/** The handles read, asked to TikTok then Instagram (names, picture, bio). */
export const confirmAccounts = (person: Person): Promise<Person> =>
  confirmTikTok(person).then(confirmInstagram);

/** People whose accounts are confirmed → Deezer, proofs, networks, flags. */
export async function matchPeople(people: Person[]): Promise<CaptureArtist[]> {
  const artists = await Promise.all(
    people.map((person) =>
      matchOnDeezer(person).then(withProofs).then(withSocials),
    ),
  );
  await Promise.all([flagExisting(artists), flagInNetwork(artists)]);
  return artists;
}

const unique = (values: string[]) => [
  ...new Map(values.map((v) => [key(v), v])).values(),
];

// Only names written on the screenshot (in the text read), without "@",
// one entry per person even when the model split it. Bio links belong to
// the account.
export function checkedPeople(reading: CaptureReading): Person[] {
  const seen = key(reading.visibleText.join(" "));
  const isWritten = (value: string) => key(value) && seen.includes(key(value));
  const links = reading.links.map((l) => l.trim()).filter(isWritten);
  // An address written on the screenshot (a profile's bio) is the account's.
  const writtenEmail = emailsIn(reading.visibleText.join("\n"))[0];
  const people: Person[] = [];

  for (const raw of reading.people) {
    const names = unique(
      raw.names.map((n) => n.trim().replace(/^@/, "")).filter(isWritten),
    ).slice(0, MAX_NAMES);
    if (names.length === 0) continue;
    // A proposed artist name must be a piece of a written name.
    const searchNames = unique(piecesOf(raw.searchNames ?? [], names)).slice(
      0,
      MAX_SEARCH_NAMES,
    );
    const read = {
      tiktok: written(raw.tiktokHandle),
      instagram: written(raw.instagram),
    };

    const same = people.find((p) =>
      p.names.some((n) => names.some((m) => key(n) === key(m))),
    );
    if (same) {
      same.names = unique([...same.names, ...names]).slice(0, MAX_NAMES);
      same.searchNames = unique([...same.searchNames, ...searchNames]);
      same.read.tiktok ??= read.tiktok;
      same.read.instagram ??= read.instagram;
      if (same.activity === "unknown")
        same.activity = raw.activity ?? "unknown";
      continue;
    }
    const account = raw.role === "account";
    people.push({
      names,
      artistName:
        names.find((n) => key(n) === key(raw.artistName.replace(/^@/, ""))) ??
        names[0],
      role: raw.role,
      reasoning: raw.reasoning.trim(),
      tiktok: null,
      profile: null,
      pictureUrl: null,
      searchNames,
      clues: account ? linkClues(links) : [],
      links: account ? links : [],
      read,
      readFrom: "capture",
      bioInstagram: null,
      email:
        account && writtenEmail
          ? { value: writtenEmail, source: "capture" }
          : null,
      writtenText: account ? reading.visibleText.join("\n") : "",
      activity: raw.activity ?? "unknown",
    });
  }
  return people.slice(0, MAX_PEOPLE);

  // A handle the model gave, kept only if it is in the text it read.
  function written(value: string | null | undefined) {
    const handle = asHandle(value);
    return handle && seen.includes(key(handle)) ? handle : null;
  }
}

async function flagExisting(artists: CaptureArtist[]) {
  const accounts = artists.flatMap((a) =>
    a.account ? [a.account, ...a.others] : a.others,
  );
  const existing = await findArtistsByDeezerIds(
    accounts.map((a) => a.deezerId),
  );
  for (const account of accounts)
    account.existing = existing.get(account.deezerId) ?? null;
}

// Already in the Réseau: same TikTok, Instagram or Deezer account. Read with
// the viewer's session; a failure only hides the hint.
async function flagInNetwork(artists: CaptureArtist[]) {
  const handle = (link: CaptureArtist["tiktok"]) =>
    link ? link.label.replace(/^@/, "") : null;
  const found = await findContactsByAccounts({
    tiktok: artists.flatMap((a) => handle(a.tiktok) ?? []),
    instagram: artists.flatMap((a) => handle(a.instagram) ?? []),
    deezer: artists.flatMap((a) => a.account?.deezerId ?? []),
  });
  for (const artist of artists)
    artist.contact =
      found.tiktok.get(handle(artist.tiktok)?.toLowerCase() ?? "") ??
      found.instagram.get(handle(artist.instagram)?.toLowerCase() ?? "") ??
      (artist.account ? found.deezer.get(artist.account.deezerId) : null) ??
      null;
}
