import "server-only";

import type {
  AccountMatch,
  DeezerAccount,
} from "@/lib/catalog/capture-artist-types";
import {
  handlesOf,
  type Matched,
  type Person,
} from "@/lib/catalog/capture-person";
import { captureKey as key, MIN_CLUE_KEY } from "@/lib/catalog/capture-text";
import {
  findArtistIdsByTrackTitle,
  getDeezerArtist,
  searchArtists,
  type DeezerArtist,
} from "@/lib/integrations/deezer";
import { listArtistReleases } from "@/lib/integrations/deezer-artist";
import { deezerIdOfAccount } from "@/lib/integrations/artist-socials";

/**
 * The Deezer account of a person read on a screenshot (Labo), decided by the
 * code. Candidates: the Deezer profile Wikidata links to the person's
 * TikTok or Instagram (proven at once, whatever its name), artists named
 * exactly after a written name or a name PO found inside one, and artists of
 * a song titled like a written name. Proof: that link, or a release whose
 * title matches another clue of the screenshot (a name, a bio link word).
 */

const MAX_ACCOUNTS = 5;
const MAX_TRACK_ARTISTS = 2;
const MAX_EVIDENCE = 3;
// A homonym with less than 1 % of the leader's fans is not a contender.
const DOMINANCE = 100;

export async function matchOnDeezer(person: Person): Promise<Matched> {
  const queries = [...new Set([...person.names, ...person.searchNames])];
  const queryKeys = new Set(queries.map(key));

  const [byAccount, byName, byTrack] = await Promise.all([
    accountsLinkedTo(person),
    Promise.all(queries.map((q) => searchArtists(q, 25))),
    Promise.all(
      person.names
        .filter((n) => key(n).length >= MIN_CLUE_KEY)
        .map(async (n) => ({
          title: key(n),
          ids: await findArtistIdsByTrackTitle(
            n,
            (title) => key(title) === key(n),
          ),
        })),
    ),
  ]);
  // Each candidate with the clue that found it: that clue proves nothing.
  const candidates = new Map<number, { artist: DeezerArtist; via: string }>();
  const linked = new Map<number, AccountMatch>();
  byAccount.forEach(({ artist, match }) => {
    candidates.set(artist.id, { artist, via: key(artist.name) });
    linked.set(artist.id, match);
  });
  byName.flat().forEach((artist) => {
    if (queryKeys.has(key(artist.name)) && !candidates.has(artist.id))
      candidates.set(artist.id, { artist, via: key(artist.name) });
  });
  const byTitle = new Map<number, string>();
  byTrack.forEach(({ title, ids }) =>
    ids.forEach((id) => byTitle.has(id) || byTitle.set(id, title)),
  );
  const trackIds = [...byTitle.keys()]
    .filter((id) => !candidates.has(id))
    .slice(0, MAX_TRACK_ARTISTS);
  (await Promise.all(trackIds.map(getDeezerArtist))).forEach((artist) => {
    if (artist)
      candidates.set(artist.id, { artist, via: byTitle.get(artist.id)! });
  });

  const byFans = (a: { artist: DeezerArtist }, b: { artist: DeezerArtist }) =>
    b.artist.fans - a.artist.fans;
  // A linked profile is never cut, however small its audience.
  const homonyms = [...candidates.values()]
    .sort(
      (a, b) =>
        Number(linked.has(b.artist.id)) - Number(linked.has(a.artist.id)) ||
        byFans(a, b),
    )
    .slice(0, MAX_ACCOUNTS)
    .sort(byFans);
  const clues = [...person.names.map(key), ...person.clues].filter(
    (k) => k.length >= MIN_CLUE_KEY,
  );
  const accounts = await Promise.all(
    homonyms.map(async ({ artist, via }) => ({
      ...(await withEvidence(artist, via, clues)),
      accountMatch: linked.get(artist.id) ?? null,
    })),
  );
  return { ...person, ...decide(accounts), suggestion: null };
}

// The Deezer profiles Wikidata links to the person's TikTok or Instagram. A
// source that fails only loses this proof.
async function accountsLinkedTo(
  person: Person,
): Promise<Array<{ artist: DeezerArtist; match: AccountMatch }>> {
  const handles = handlesOf(person);
  const found = await Promise.all(
    (["tiktok", "instagram"] as const).map(async (network) => {
      const handle = handles[network];
      if (!handle) return null;
      const id = await deezerIdOfAccount(network, handle).catch(() => null);
      const artist = id ? await getDeezerArtist(id).catch(() => null) : null;
      return artist
        ? { artist, match: { network, handle, source: "wikidata" as const } }
        : null;
    }),
  );
  const unique = new Map<
    number,
    { artist: DeezerArtist; match: AccountMatch }
  >();
  found.forEach(
    (f) => f && !unique.has(f.artist.id) && unique.set(f.artist.id, f),
  );
  return [...unique.values()];
}

/**
 * The account, from the proofs gathered so far: the same TikTok or Instagram
 * linked to the Deezer profile first (MusicBrainz / Wikidata), then a
 * release or the Deezer biography matching the screenshot.
 */
export function decide(
  accounts: DeezerAccount[],
): Pick<Matched, "status" | "account" | "others"> {
  const rest = (pick: DeezerAccount) => accounts.filter((a) => a !== pick);
  const same = accounts.filter((a) => a.accountMatch);
  if (same.length === 1)
    return { status: "linked", account: same[0], others: rest(same[0]) };
  const linked = (same.length > 1 ? same : accounts).filter(
    (a) => a.evidence.length > 0 || a.bioMatch.length > 0,
  );
  if (linked.length === 1)
    return { status: "linked", account: linked[0], others: rest(linked[0]) };
  if (accounts.length === 0)
    return { status: "none", account: null, others: [] };
  // An empty homonym (Tiakola, 1.7 M fans, and a Tiakola with none) does not
  // make the name ambiguous: it stays listed, the one with an audience leads.
  const top = accounts[0];
  const contenders = accounts.filter(
    (a) => a === top || a.fans * DOMINANCE >= top.fans,
  );
  if (linked.length === 0 && contenders.length === 1)
    return { status: "single", account: top, others: rest(top) };
  // Several homonyms (or several linked): a person chooses, proven first.
  return {
    status: "several",
    account: null,
    others: [...linked, ...accounts.filter((a) => !linked.includes(a))],
  };
}

// Releases whose title carries a clue other than the account's own name and
// the one that found it (a song titled "Straat" proves nothing about "Straat").
async function withEvidence(
  artist: DeezerArtist,
  via: string,
  clues: string[],
): Promise<DeezerAccount> {
  const own = key(artist.name);
  const others = [...new Set(clues)].filter((k) => k !== own && k !== via);
  const releases = others.length ? await listArtistReleases(artist.id) : [];
  const evidence = [
    ...new Set(
      releases
        .filter((r) => others.some((k) => key(r.title).includes(k)))
        .map((r) => r.title),
    ),
  ].slice(0, MAX_EVIDENCE);
  return { ...deezerAccountOf(artist), evidence };
}

/** A Deezer artist as the Labo shows it, before any proof. */
export function deezerAccountOf(artist: DeezerArtist): DeezerAccount {
  return {
    deezerId: artist.id,
    name: artist.name,
    link: artist.link,
    pictureUrl: artist.pictureMedium,
    fans: artist.fans,
    releaseCount: artist.releaseCount,
    evidence: [],
    bioMatch: [],
    accountMatch: null,
    bio: null,
    existing: null,
  };
}
