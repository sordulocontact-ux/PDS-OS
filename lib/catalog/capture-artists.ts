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
import type { Person } from "@/lib/catalog/capture-person";
import { confirmTikTok, withSocials } from "@/lib/catalog/capture-socials";
import {
  captureKey as key,
  linkClues,
  MIN_CLUE_KEY,
} from "@/lib/catalog/capture-text";
import { findArtistsByDeezerIds } from "@/lib/catalog/queries";
import { asHandle } from "@/lib/integrations/artist-socials";

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
  const people: Person[] = [];

  for (const raw of reading.people) {
    const names = unique(
      raw.names.map((n) => n.trim().replace(/^@/, "")).filter(isWritten),
    ).slice(0, MAX_NAMES);
    if (names.length === 0) continue;
    // A proposed artist name must be a piece of a written name.
    const searchNames = unique(
      (raw.searchNames ?? [])
        .map((n) => n.trim())
        .filter(
          (n) =>
            key(n).length >= MIN_CLUE_KEY &&
            names.some((written) => key(written).includes(key(n))),
        ),
    ).slice(0, MAX_SEARCH_NAMES);
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
      searchNames,
      clues: account ? linkClues(links) : [],
      links: account ? links : [],
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
