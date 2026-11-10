// The SACEM bulletin's people as Ibé asked on 02/11/2026: « participant +
// rôle(s) + répartition par catégorie », instead of « personne + qualité +
// nombre de parts » (which let a dossier reach 125 %). Each category is
// shared on its own and must make 100 %: Auteur (authors and adapters, the
// words), Compositeur (composers and arrangers, the music), Éditeur (the
// music publishers, when there are some). The Phono share of each line of the
// bulletin is derived: the category's part times the share within it, in
// exact units, so the bulletin always totals 100 %. Pure, client-safe.

import {
  QUALITIES,
  type Creator,
  type PhonoSplit,
  type Publisher,
  type Quality,
} from "@/lib/legal/formalities/definition";
import { allocate } from "@/lib/legal/formalities/sharing-rule";
import { FULL, shareOf, totalUnits, unitsOf } from "@/lib/legal/splits/shares";

export const CATEGORIES = ["author", "composer", "publisher"] as const;
export type ShareCategory = (typeof CATEGORIES)[number];

/** The category a role takes its share from. */
export const CATEGORY_OF: Record<Quality, "author" | "composer"> = {
  author: "author",
  adapter: "author",
  composer: "composer",
  arranger: "composer",
};

/** On a line of the bulletin: a participant who wrote or composed. */
export const onBulletin = (c: Creator) =>
  !c.performer_only && c.roles.length > 0;

export const creatorName = (c: Creator) =>
  c.pseudonym || [c.first_name, c.last_name].filter(Boolean).join(" ");

// A share typed with a comma or a « % » is read the same.
const units = (text: string | undefined) =>
  text ? unitsOf(text.replace(",", ".")) : null;

/** Who shares a category: each (participant, role) or each publisher. */
export type Member = {
  category: ShareCategory;
  // Creator's position (from 0) and role, or publisher's position.
  creator?: number;
  role?: Quality;
  publisher?: number;
  share: string;
};

export function membersOf(
  creators: Creator[],
  publishers: Publisher[],
): Record<ShareCategory, Member[]> {
  const out: Record<ShareCategory, Member[]> = {
    author: [],
    composer: [],
    publisher: [],
  };
  creators.forEach((c, i) => {
    if (!onBulletin(c)) return;
    for (const role of QUALITIES)
      if (c.roles.includes(role))
        out[CATEGORY_OF[role]].push({
          category: CATEGORY_OF[role],
          creator: i,
          role,
          share: c.shares[role] ?? "",
        });
  });
  publishers.forEach((p, i) =>
    out.publisher.push({ category: "publisher", publisher: i, share: p.share }),
  );
  return out;
}

/** The total of a category's shares, in units (100 % = FULL). */
export const categoryTotal = (members: Member[]) =>
  totalUnits(members.map((m) => units(m.share)));

// The usual Phono parts between categories, as the bulletin's notice reads
// for the rights on recordings (retour d'Ibé): edited 25 % / 25 % / 50 %,
// unedited half each; a category nobody holds (an instrumental) leaves its
// part to the others in the same proportions.
const BASE: Record<ShareCategory, number> = {
  author: 1,
  composer: 1,
  publisher: 2,
};

/** The Phono part of each category, in units, summing to FULL. */
export function categoryParts(
  members: Record<ShareCategory, Member[]>,
  split: PhonoSplit | null,
): Record<ShareCategory, number> {
  const custom = split?.custom;
  if (custom) {
    const parts = {
      author: units(custom.author) ?? 0,
      composer: units(custom.composer) ?? 0,
      publisher: units(custom.publisher) ?? 0,
    };
    return parts;
  }
  const held = CATEGORIES.filter((c) => members[c].length > 0);
  const parts = allocate(
    FULL,
    held.map((c) => BASE[c]),
  );
  return {
    author: 0,
    composer: 0,
    publisher: 0,
    ...Object.fromEntries(held.map((c, i) => [c, parts[i]])),
  };
}

/** Contractual parts hold when they make 100 % and give a part to every
 * category held, and none to a category nobody holds (as formality_missing). */
export function partsHold(
  members: Record<ShareCategory, Member[]>,
  split: PhonoSplit | null,
): boolean {
  if (!split?.custom) return true;
  const parts = categoryParts(members, split);
  return (
    totalUnits(CATEGORIES.map((c) => parts[c])) === FULL &&
    CATEGORIES.every((c) => members[c].length > 0 === parts[c] > 0)
  );
}

/** The usual parts, written as the editor shows them (« 25 »). */
export function usualParts(
  members: Record<ShareCategory, Member[]>,
): PhonoSplit["custom"] {
  const parts = categoryParts(members, null);
  const text = (u: number) => shareOf(u).replace(/\.?0+$/, "");
  return {
    author: text(parts.author),
    composer: text(parts.composer),
    publisher: text(parts.publisher),
  };
}

export type BulletinLine = { quality: Quality; phono: number };
export type BulletinShares = {
  // By creator's position: their lines on the bulletin (one per role).
  creators: BulletinLine[][];
  // By publisher's position.
  publishers: number[];
  total: number;
};

/**
 * The Phono share of every line of the bulletin. A category whose shares
 * make exactly 100 % is shared exactly (the units always add up); otherwise
 * each line is its part as typed, so the total says what is wrong.
 */
export function bulletinShares(
  creators: Creator[],
  publishers: Publisher[],
  split: PhonoSplit | null,
): BulletinShares {
  const members = membersOf(creators, publishers);
  const parts = categoryParts(members, split);
  const out: BulletinShares = {
    creators: creators.map(() => []),
    publishers: publishers.map(() => 0),
    total: 0,
  };
  for (const category of CATEGORIES) {
    const list = members[category];
    const typed = list.map((m) => units(m.share) ?? 0);
    const exact = totalUnits(typed) === FULL;
    const phono = exact
      ? allocate(parts[category], typed)
      : typed.map((u) => Math.floor((parts[category] * u) / FULL));
    list.forEach((m, k) => {
      if (m.publisher !== undefined) out.publishers[m.publisher] = phono[k];
      else out.creators[m.creator!].push({ quality: m.role!, phono: phono[k] });
    });
  }
  out.total =
    totalUnits(out.creators.flat().map((l) => l.phono)) +
    totalUnits(out.publishers);
  return out;
}

/** A category held by one member alone is 100 % theirs, without typing. */
export function withSoleShares(
  creators: Creator[],
  publishers: Publisher[],
): { creators: Creator[]; publishers: Publisher[] } {
  const members = membersOf(creators, publishers);
  const nextCreators = creators.map((c) => ({ ...c, shares: { ...c.shares } }));
  const nextPublishers = publishers.map((p) => ({ ...p }));
  for (const category of CATEGORIES) {
    const [only, ...rest] = members[category];
    if (!only || rest.length > 0) continue;
    if (only.publisher !== undefined)
      nextPublishers[only.publisher].share = "100";
    else nextCreators[only.creator!].shares[only.role!] = "100";
  }
  // A role given up takes its share with it.
  nextCreators.forEach((c) => {
    for (const role of QUALITIES)
      if (!onBulletin(c) || !c.roles.includes(role)) delete c.shares[role];
  });
  return { creators: nextCreators, publishers: nextPublishers };
}

/**
 * After a change of who is in a category (someone added or removed, a role
 * given or taken): those categories are shared equally again — a share typed
 * before no longer means anything — and one held alone is 100 %. The other
 * categories keep their typed shares.
 */
export function reshare(
  creators: Creator[],
  publishers: Publisher[],
  changed: readonly ShareCategory[],
): { creators: Creator[]; publishers: Publisher[] } {
  const now = membersOf(creators, publishers);
  const nextCreators = creators.map((c) => ({ ...c, shares: { ...c.shares } }));
  const nextPublishers = publishers.map((p) => ({ ...p }));
  for (const category of new Set(changed)) {
    const equal = equalShares(now[category].length);
    now[category].forEach((m, k) => {
      if (m.publisher !== undefined)
        nextPublishers[m.publisher].share = equal[k];
      else nextCreators[m.creator!].shares[m.role!] = equal[k];
    });
  }
  return withSoleShares(nextCreators, nextPublishers);
}

/** The categories a participant's roles take part in. */
export const categoriesOf = (c: Creator | undefined): ShareCategory[] =>
  c && onBulletin(c) ? [...new Set(c.roles.map((r) => CATEGORY_OF[r]))] : [];

/** The category's shares made equal, exactly (« Parts égales »). */
export function equalShares(count: number): string[] {
  return allocate(
    FULL,
    Array.from({ length: count }, () => 1),
  ).map((u) => shareOf(u).replace(/\.?0+$/, ""));
}

// Before 09/11/2026 a creator was one quality and one Phono share of the
// whole bulletin: read as a participant with that role, their share within
// the category being their Phono over the category's Phono.
type LegacyCreator = Partial<Creator> & { quality?: string; phono?: string };
type LegacyPublisher = Partial<Publisher> & { phono?: string };

const isQuality = (q: unknown): q is Quality =>
  (QUALITIES as readonly unknown[]).includes(q);

export function readCreators(raw: unknown): Creator[] {
  if (!Array.isArray(raw)) return [];
  const list = raw as LegacyCreator[];
  const legacy = list.some((c) => !Array.isArray(c.roles));
  const totals: Record<"author" | "composer", number> = {
    author: 0,
    composer: 0,
  };
  if (legacy)
    for (const c of list)
      if (isQuality(c.quality))
        totals[CATEGORY_OF[c.quality]] += units(c.phono) ?? 0;
  return list.map((c) => {
    const base = {
      last_name: c.last_name ?? "",
      first_name: c.first_name ?? "",
      pseudonym: c.pseudonym ?? "",
      ipi: c.ipi ?? "",
      signs: c.signs ?? true,
      ...(c.contact_id ? { contact_id: c.contact_id } : {}),
      ...(c.main_artist ? { main_artist: true } : {}),
      ...(c.artist_id ? { artist_id: c.artist_id } : {}),
      ...(c.confirmed ? { confirmed: true } : {}),
      ...(c.performer_only ? { performer_only: true } : {}),
    };
    if (Array.isArray(c.roles))
      return {
        ...base,
        roles: c.roles.filter(isQuality),
        shares: { ...(c.shares ?? {}) },
      };
    if (!isQuality(c.quality)) return { ...base, roles: [], shares: {} };
    const total = totals[CATEGORY_OF[c.quality]];
    const own = units(c.phono) ?? 0;
    return {
      ...base,
      roles: [c.quality],
      shares: total
        ? {
            [c.quality]: shareOf(Math.round((own * FULL) / total)).replace(
              /\.?0+$/,
              "",
            ),
          }
        : {},
    };
  });
}

export function readPublishers(raw: unknown): Publisher[] {
  if (!Array.isArray(raw)) return [];
  const list = raw as LegacyPublisher[];
  const legacy = list.some((p) => p.share === undefined);
  const total = legacy ? totalUnits(list.map((p) => units(p.phono))) : 0;
  return list.map((p) => {
    const { phono, ...rest } = p;
    const share =
      p.share ??
      (total
        ? shareOf(Math.round(((units(phono) ?? 0) * FULL) / total)).replace(
            /\.?0+$/,
            "",
          )
        : "");
    return { name: "", ipi: "", ...rest, share } as Publisher;
  });
}

export function readPhonoSplit(raw: unknown): PhonoSplit {
  return raw && typeof raw === "object" ? (raw as PhonoSplit) : {};
}
