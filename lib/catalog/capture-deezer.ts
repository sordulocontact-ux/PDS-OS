import "server-only";

import type { DeezerAccount } from "@/lib/catalog/capture-artist-types";
import type { Matched, Person } from "@/lib/catalog/capture-person";
import { captureKey as key, MIN_CLUE_KEY } from "@/lib/catalog/capture-text";
import {
  findArtistIdsByTrackTitle,
  getDeezerArtist,
  searchArtists,
  type DeezerArtist,
} from "@/lib/integrations/deezer";
import { listArtistReleases } from "@/lib/integrations/deezer-artist";

/**
 * The Deezer account of a person read on a screenshot (Labo), decided by the
 * code. Candidates: artists named exactly after a written name or a name PO
 * found inside one, and artists of a song titled like a written name. Proof:
 * a release whose title matches another clue of the screenshot (a name, a
 * bio link word).
 */

const MAX_ACCOUNTS = 5;
const MAX_TRACK_ARTISTS = 2;
const MAX_EVIDENCE = 3;
// A homonym with less than 1 % of the leader's fans is not a contender.
const DOMINANCE = 100;

export async function matchOnDeezer(person: Person): Promise<Matched> {
  const queries = [...new Set([...person.names, ...person.searchNames])];
  const queryKeys = new Set(queries.map(key));

  const [byName, byTrack] = await Promise.all([
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
  byName.flat().forEach((artist) => {
    if (queryKeys.has(key(artist.name)))
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

  const homonyms = [...candidates.values()]
    .sort((a, b) => b.artist.fans - a.artist.fans)
    .slice(0, MAX_ACCOUNTS);
  const clues = [...person.names.map(key), ...person.clues].filter(
    (k) => k.length >= MIN_CLUE_KEY,
  );
  const accounts = await Promise.all(
    homonyms.map(({ artist, via }) => withEvidence(artist, via, clues)),
  );
  return { ...person, ...decide(accounts) };
}

function decide(
  accounts: DeezerAccount[],
): Pick<Matched, "status" | "account" | "others"> {
  const linked = accounts.filter((a) => a.evidence.length > 0);
  const rest = (pick: DeezerAccount) => accounts.filter((a) => a !== pick);
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
