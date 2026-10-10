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
  DeezerAccount,
} from "@/lib/catalog/capture-artist-types";
import { confirmTikTok, withSocials } from "@/lib/catalog/capture-socials";
import { findArtistsByDeezerIds } from "@/lib/catalog/queries";
import { asHandle } from "@/lib/integrations/artist-socials";
import { searchArtists, type DeezerArtist } from "@/lib/integrations/deezer";
import { listArtistReleases } from "@/lib/integrations/deezer-artist";

/**
 * A TikTok screenshot → the artists on it and their Deezer account (Labo).
 * The model reads the image and groups the names by person; everything else
 * is code: a name is kept only if it is in the text the model read, the
 * Deezer account is an exact homonym, confirmed when its releases carry
 * another name of the same person.
 */

// Names compared without case, accents, spaces or punctuation.
const key = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// A person has a handful of names; a screenshot, a handful of people.
const MAX_PEOPLE = 6;
const MAX_NAMES = 3;
const MAX_ACCOUNTS = 4;
const MAX_EVIDENCE = 3;
// "dj" or "jo" would match half of any discography.
const MIN_EVIDENCE_KEY = 4;
// A homonym with less than 1 % of the leader's fans is not a contender.
const DOMINANCE = 100;

export async function readCaptureArtists(image: {
  data: Uint8Array;
  mediaType: string;
}): Promise<CaptureArtistsResult> {
  const reading = await extractFromImage(
    captureReadingSchema,
    image,
    CAPTURE_READING_INSTRUCTIONS,
  );
  const people = checkedPeople(reading.output);
  const artists = await Promise.all(
    people.map((person) =>
      confirmTikTok(person).then(matchOnDeezer).then(withSocials),
    ),
  );
  await flagExisting(artists);
  return {
    isTikTok: reading.output.isTikTok,
    analysis: reading.output.analysis,
    artists,
    model: reading.model,
    durationMs: reading.durationMs,
  };
}

export type Person = Pick<
  CaptureArtist,
  "names" | "artistName" | "role" | "reasoning" | "tiktok"
> & {
  // Handles as read on the screenshot, before any check.
  read: { tiktok: string | null; instagram: string | null };
};
export type Matched = Person &
  Pick<CaptureArtist, "status" | "account" | "others">;

// Only names written on the screenshot (in the text read), without "@",
// one entry per person even when the model split it.
export function checkedPeople(reading: CaptureReading): Person[] {
  const seen = key(reading.visibleText.join(" "));
  const people: Person[] = [];
  for (const raw of reading.people) {
    const names = [
      ...new Map(
        raw.names
          .map((name) => name.trim().replace(/^@/, ""))
          .filter((name) => key(name) && seen.includes(key(name)))
          .map((name) => [key(name), name]),
      ).values(),
    ].slice(0, MAX_NAMES);
    if (names.length === 0) continue;
    const same = people.find((p) =>
      p.names.some((n) => names.some((m) => key(n) === key(m))),
    );
    const read = {
      tiktok: written(raw.tiktokHandle),
      instagram: written(raw.instagram),
    };
    if (same) {
      same.names = [...new Set([...same.names, ...names])].slice(0, MAX_NAMES);
      same.read.tiktok ??= read.tiktok;
      same.read.instagram ??= read.instagram;
      continue;
    }
    const artistName =
      names.find((n) => key(n) === key(raw.artistName.replace(/^@/, ""))) ??
      names[0];
    people.push({
      names,
      artistName,
      role: raw.role,
      reasoning: raw.reasoning.trim(),
      tiktok: null,
      read,
    });
  }
  return people.slice(0, MAX_PEOPLE);

  // A handle the model gave, kept only if it is in the text it read.
  function written(value: string | null | undefined) {
    const handle = asHandle(value);
    return handle && seen.includes(key(handle)) ? handle : null;
  }
}

export async function matchOnDeezer(person: Person): Promise<Matched> {
  // Exact homonyms of each name; Deezer's own ranking is not trusted.
  const found = await Promise.all(
    person.names.map((name) => searchArtists(name, 25)),
  );
  const byId = new Map<number, DeezerArtist>();
  found.flat().forEach((artist) => {
    if (person.names.some((name) => key(name) === key(artist.name)))
      byId.set(artist.id, artist);
  });
  const homonyms = [...byId.values()]
    .sort((a, b) => b.fans - a.fans)
    .slice(0, MAX_ACCOUNTS);

  const accounts = await Promise.all(
    homonyms.map((artist) => withEvidence(artist, person.names)),
  );
  const linked = accounts.filter((a) => a.evidence.length > 0);
  const rest = (pick: DeezerAccount) => accounts.filter((a) => a !== pick);

  if (linked.length === 1)
    return {
      ...person,
      status: "linked",
      account: linked[0],
      others: rest(linked[0]),
    };
  // An empty homonym (Tiakola, 1.7 M fans, and a Tiakola with none) does not
  // make the name ambiguous: it stays listed, the one with an audience leads.
  const top = accounts[0];
  const contenders = accounts.filter(
    (a) => a === top || a.fans * DOMINANCE >= top.fans,
  );
  if (contenders.length === 1)
    return { ...person, status: "single", account: top, others: rest(top) };
  if (accounts.length === 0)
    return { ...person, status: "none", account: null, others: [] };
  // Several homonyms (or several linked): a person chooses, most fans first.
  const ranked = [...linked, ...accounts.filter((a) => !linked.includes(a))];
  return { ...person, status: "several", account: null, others: ranked };
}

// Releases of the account whose title carries another name of the person.
async function withEvidence(
  artist: DeezerArtist,
  names: string[],
): Promise<DeezerAccount> {
  const others = names
    .map(key)
    .filter((k) => k !== key(artist.name) && k.length >= MIN_EVIDENCE_KEY);
  const releases = others.length ? await listArtistReleases(artist.id) : [];
  const evidence = [
    ...new Set(
      releases
        .filter((r) => others.some((k) => key(r.title).includes(k)))
        .map((r) => r.title),
    ),
  ].slice(0, MAX_EVIDENCE);
  return {
    deezerId: artist.id,
    name: artist.name,
    link: artist.link,
    pictureUrl: artist.pictureMedium,
    fans: artist.fans,
    releaseCount: artist.releaseCount,
    evidence,
    existing: null,
  };
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
