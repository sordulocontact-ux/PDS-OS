import "server-only";

import { CAPTURE_CHOICE_INSTRUCTIONS } from "@/lib/ai/instructions/capture-choice";
import { extract } from "@/lib/ai/llm";
import { captureChoiceSchema } from "@/lib/ai/schemas/capture-choice";
import type {
  AccountMatch,
  DeezerAccount,
} from "@/lib/catalog/capture-artist-types";
import { decide } from "@/lib/catalog/capture-deezer";
import type { Matched } from "@/lib/catalog/capture-person";
import { captureKey as key, MIN_CLUE_KEY } from "@/lib/catalog/capture-text";
import { htmlToText } from "@/lib/catalog/artist-profile";
import { socialsOfDeezerArtist } from "@/lib/integrations/artist-socials";
import { getDeezerBio } from "@/lib/integrations/deezer-bio";
import { listArtistReleases } from "@/lib/integrations/deezer-artist";

/**
 * Telling Deezer homonyms apart (Labo, Sacha 10/10/2026: « comparer les bios
 * Deezer avec Insta et TikTok »). For each contender, by the code: the
 * Deezer profile linked by MusicBrainz / Wikidata to the TikTok or Instagram
 * of the screenshot (the strongest proof), and its Deezer biography citing a
 * handle or a name of the screenshot. Still several: PO compares bios,
 * releases and audience and leans for one (`suggestion`), never decides; a
 * person chooses in the Labo. "À vérifier" gets the same proofs, which may
 * turn it into "Compte trouvé".
 */

const MAX_CONTENDERS = 4;
// MusicBrainz answers one request per second: the most followed first.
const MAX_LINKED_LOOKUPS = 3;
const BIO_EXCERPT = 300;
const BIO_FOR_PO = 600;
const RELEASES_FOR_PO = 5;
const REASONING_MAX = 500;

// An account with its proofs, and its whole Deezer biography (for PO only).
type Proven = { account: DeezerAccount; bioText: string | null };

export async function withProofs(person: Matched): Promise<Matched> {
  if (person.status !== "several" && person.status !== "single") return person;
  const all = person.account
    ? [person.account, ...person.others]
    : person.others;
  const byFans = [...all].sort((a, b) => b.fans - a.fans);
  const pool = person.status === "single" ? byFans.slice(0, 1) : byFans;
  const contenders = pool.slice(0, MAX_CONTENDERS);

  const handles = {
    tiktok: person.tiktok?.label.replace(/^@/, "").toLowerCase() ?? null,
    instagram:
      (person.read.instagram ?? person.bioInstagram)?.toLowerCase() ?? null,
  };
  // What a Deezer biography may cite, as written on the screenshot.
  const words = [
    ...(handles.tiktok ? [`@${handles.tiktok}`] : []),
    ...(handles.instagram ? [`@${handles.instagram}`] : []),
    ...person.names,
  ];

  const proven = await Promise.all(
    contenders.map((account, index) =>
      prove(account, handles, words, index < MAX_LINKED_LOOKUPS),
    ),
  );
  const decided = decide(
    byFans.map(
      (a) =>
        proven.find((p) => p.account.deezerId === a.deezerId)?.account ?? a,
    ),
  );
  if (decided.status !== "several")
    return { ...person, ...decided, suggestion: null };

  const suggestion = await lean(
    person,
    proven.filter((p) =>
      decided.others.some((o) => o.deezerId === p.account.deezerId),
    ),
  ).catch((error) => {
    console.error("capture-proofs:", error);
    return null;
  });
  return { ...person, ...decided, suggestion };
}

async function prove(
  account: DeezerAccount,
  handles: { tiktok: string | null; instagram: string | null },
  words: string[],
  lookLinked: boolean,
): Promise<Proven> {
  const [bio, linked] = await Promise.all([
    // Deezer's internal API (lib/integrations/deezer-bio.ts): a failure
    // only loses this proof.
    getDeezerBio(account.deezerId).catch(() => null),
    lookLinked && (handles.tiktok || handles.instagram)
      ? socialsOfDeezerArtist(account.deezerId).catch(() => null)
      : Promise.resolve(null),
  ]);
  const text = bio ? htmlToText(bio.html).trim() : null;
  const own = key(account.name);
  const bioKey = text ? key(text) : "";
  const bioMatch = text
    ? [
        ...new Set(
          words.filter((word) => {
            const k = key(word);
            return k.length >= MIN_CLUE_KEY && k !== own && bioKey.includes(k);
          }),
        ),
      ]
    : [];

  let accountMatch: AccountMatch | null = null;
  for (const network of ["tiktok", "instagram"] as const) {
    const found = linked?.[network];
    if (
      !accountMatch &&
      found &&
      handles[network] &&
      found.handle.toLowerCase() === handles[network]
    )
      accountMatch = { network, handle: found.handle, source: found.source };
  }

  return {
    account: {
      ...account,
      bioMatch,
      accountMatch,
      bio: text ? excerpt(text, BIO_EXCERPT) : null,
    },
    bioText: text,
  };
}

// PO's lean among the contenders still undecided; kept only when it names
// one of them.
async function lean(
  person: Matched,
  contenders: Proven[],
): Promise<Matched["suggestion"]> {
  if (contenders.length < 2) return null;
  const releases = await Promise.all(
    contenders.map(({ account }) =>
      listArtistReleases(account.deezerId)
        .then((list) => list.slice(0, RELEASES_FOR_PO).map((r) => r.title))
        .catch(() => []),
    ),
  );
  const data = {
    person: {
      names: person.names,
      role: person.role,
      reading: person.reasoning,
      tiktok: person.profile
        ? {
            handle: person.tiktok?.label ?? null,
            displayName: person.profile.displayName,
            bio: person.profile.bio,
            bioLink: person.profile.bioLink,
            followers: person.profile.followers,
          }
        : (person.tiktok?.label ?? null),
      instagram: person.read.instagram ?? person.bioInstagram,
    },
    candidates: contenders.map(({ account, bioText }, i) => ({
      deezerId: account.deezerId,
      name: account.name,
      fans: account.fans,
      releaseCount: account.releaseCount,
      releases: releases[i],
      bio: bioText ? excerpt(bioText, BIO_FOR_PO) : null,
    })),
  };
  const { output } = await extract(
    captureChoiceSchema,
    JSON.stringify(data, null, 2),
    CAPTURE_CHOICE_INSTRUCTIONS,
  );
  const picked = contenders.find(
    ({ account }) => account.deezerId === output.deezerId,
  )?.account;
  // Shown as plain text: emphasis marks the model adds are dropped.
  const reasoning = output.analysis
    .replace(/(\*\*|\*|__)(.+?)\1/g, "$2")
    .trim();
  // Undecided, its comparison still helps the person who chooses.
  return reasoning
    ? {
        deezerId: picked?.deezerId ?? null,
        reasoning: excerpt(reasoning, REASONING_MAX),
      }
    : null;
}

function excerpt(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}
