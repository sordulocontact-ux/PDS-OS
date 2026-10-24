// Exact shares of a split sheet (ticket Juridique 04: « La somme stockée doit
// être exactement égale à 100 %, indépendamment de l'affichage arrondi »).
// Every share is counted in ten-thousandths of a percent, an integer, so no
// float rounding ever reaches the total; shown rounded to 2 decimals.
// Client-safe.

import {
  splitTotal,
  type ContributorRole,
  type MasterSplit,
  type SplitRole as TitleSplitRole,
} from "@/lib/catalog/master/rules";

export const SPLIT_ROLES = [
  "author",
  "composer",
  "author_composer",
  "arranger",
  "publisher",
  "other",
] as const;
export type SplitRole = (typeof SPLIT_ROLES)[number];

// The roles of a creator of the work (JUR-01); a publisher represents them.
export const CREATOR_ROLES = [
  "author",
  "composer",
  "author_composer",
  "arranger",
] as const satisfies readonly SplitRole[];
export type CreatorRole = (typeof CREATOR_ROLES)[number];
export const isCreatorRole = (role: SplitRole): role is CreatorRole =>
  (CREATOR_ROLES as readonly SplitRole[]).includes(role);

/** 100 % in units. */
export const FULL = 1_000_000;

/** Units from a typed share (« 33,3334 », « 50 »), or null. */
export function unitsOf(text: string | number): number | null {
  const clean = String(text).trim().replace(",", ".").replace(/\s*%$/, "");
  const m = /^(\d{1,3})(?:\.(\d{1,4}))?$/.exec(clean);
  if (!m) return null;
  const units = Number(m[1]) * 10_000 + Number((m[2] ?? "").padEnd(4, "0"));
  return units > 0 && units <= FULL ? units : null;
}

/** « 33.3334 », what the database stores. */
export const shareOf = (units: number) =>
  `${Math.floor(units / 10_000)}.${String(units % 10_000).padStart(4, "0")}`;

/** « 33,3334 », what the editor shows (exact, trailing zeros dropped). */
export const exactShare = (units: number) =>
  shareOf(units)
    .replace(/\.?0+$/, "")
    .replace(".", ",");

const shown = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** « 33,33 % », rounded for reading. */
export const formatShare = (units: number) =>
  `${shown.format(units / 10_000)} %`;

export const totalUnits = (units: Array<number | null>) =>
  units.reduce<number>((sum, u) => sum + (u ?? 0), 0);

// A creator's credits as a line of the sheet; other credits are not in it.
// Words and music by the same person: one line, author and composer.
const ROLE_OF: Partial<Record<ContributorRole, CreatorRole>> = {
  lyricist: "author",
  composer: "composer",
  arranger: "arranger",
};
export function splitRoleOf(roles: ContributorRole[]): CreatorRole | null {
  const mine = new Set(roles.flatMap((r) => ROLE_OF[r] ?? []));
  if (mine.has("author") && mine.has("composer")) return "author_composer";
  return (
    (["author", "composer", "arranger"] as const).find((r) => mine.has(r)) ??
    null
  );
}

const ROLE_OF_TITLE: Partial<Record<TitleSplitRole, SplitRole>> = {
  author: "author",
  composer: "composer",
  publisher: "publisher",
};

/**
 * The publishing split already written on the title's page, when it makes
 * 100 %: where a first version starts, instead of equal parts (Sacha's
 * feedback of 05/10/2026: the Répartitions said nothing was split while the
 * title was). Shares there have 2 decimals, so they convert exactly.
 */
export function titlePublishingLines(splits: MasterSplit[]): Array<{
  name: string;
  role: SplitRole;
  units: number;
  contactId: string | null;
}> | null {
  if (splitTotal(splits, "publishing").status !== "complete") return null;
  return splits
    .filter((s) => s.kind === "publishing")
    .map((s) => ({
      name: s.party,
      role: ROLE_OF_TITLE[s.role] ?? "other",
      units: Math.round(s.share * 10_000),
      contactId: s.contactId ?? null,
    }));
}
