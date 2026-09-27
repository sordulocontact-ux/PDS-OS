// Catalog types and pure helpers. Client-safe.

import type { FieldErrors, FormValues } from "@/lib/auth/form-state";
import type { MasterRelease } from "@/lib/catalog/master-release";
import {
  variantText,
  type AudioState,
  type Variant,
} from "@/lib/catalog/title-rules";

export const CREDIT_ROLES = ["main", "featuring"] as const;
export type CreditRole = (typeof CREDIT_ROLES)[number];

export type ArtistOption = { id: string; name: string };

// Relation of an artist with PDS (docs/ARCHITECTURE.md § 2 quinquies): what
// the artist is to PDS, apart from the record's state (archived or not).
export const ARTIST_RELATIONS = ["signed", "collaboration"] as const;
export type ArtistRelation = (typeof ARTIST_RELATIONS)[number];

export function isArtistRelation(value: unknown): value is ArtistRelation {
  return (ARTIST_RELATIONS as readonly unknown[]).includes(value);
}

// The column is checked in SQL; the fallback only satisfies the type.
export const artistRelationOf = (value: string): ArtistRelation =>
  isArtistRelation(value) ? value : "signed";

export type ArtistListItem = {
  id: string;
  name: string;
  pictureUrl: string | null;
  notes: string | null;
  relation: ArtistRelation;
  // Live masters crediting the artist.
  masterCount: number;
};

export type Credit = { artistId: string; name: string; role: CreditRole };

// A title ("master" in the code, docs/ARCHITECTURE.md § 2 septies).
export type MasterOption = {
  id: string;
  title: string;
  variant: Variant;
  // The words given for "Autre"; null otherwise.
  variantLabel: string | null;
  // Credits in display order, already formatted ("Nova feat. Sable").
  artists: string;
};

export type MasterListItem = MasterOption & {
  // Null when unknown: never guessed.
  audioState: AudioState | null;
  isrc: string | null;
  durationSeconds: number | null;
};

/** A row of the masters list: the master and the release shown for it. */
export type MasterRow = MasterListItem & {
  release: MasterRelease | null;
  // Live projects using it: archiving waits for them.
  projectCount: number;
};

/** The title form's values, as text (a select or field each). */
export type MasterFormDefaults = {
  title: string;
  // "" = unknown.
  audioState: string;
  variant: string;
  variantLabel: string;
  // Form formats: "FRZ032600001", "3:07"; empty when not given.
  isrc: string;
  duration: string;
};

export function masterFormDefaults(master: MasterListItem): MasterFormDefaults {
  return {
    title: master.title,
    audioState: master.audioState ?? "",
    variant: master.variant,
    variantLabel: master.variantLabel ?? "",
    isrc: master.isrc ?? "",
    duration:
      master.durationSeconds != null
        ? formatDuration(master.durationSeconds)
        : "",
  };
}

export type LinkedProject = { id: string; title: string; type: string };

export type MasterDetail = MasterListItem & {
  credits: Credit[];
  projects: LinkedProject[];
};

// One Deezer search result, flagged when the catalog already holds it.
export type DeezerArtistResult = {
  deezerId: number;
  name: string;
  pictureUrl: string | null;
  fans: number;
  existing: ArtistOption | null;
};

export type CreateArtistState =
  | { status: "idle" }
  | {
      status: "error";
      formError?: string;
      fieldErrors?: FieldErrors;
      values?: FormValues;
      // Set when the name is taken: the screen offers the existing artist.
      existing?: ArtistOption;
    }
  | { status: "created"; artist: ArtistOption };

export const idleCreateArtistState: CreateArtistState = { status: "idle" };

export type CreateMasterState =
  | { status: "idle" }
  | {
      status: "error";
      formError?: string;
      fieldErrors?: FieldErrors;
      values?: FormValues;
    }
  | { status: "created"; master: MasterOption };

export const idleCreateMasterState: CreateMasterState = { status: "idle" };

const fansFormat = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// 1732480 → "1,7 M", 20380 → "20 k".
export function formatFans(fans: number): string {
  return fansFormat.format(fans);
}

// "fr-z03 26 00001" → "FRZ032600001". Null when empty.
export function normalizeIsrc(input: string): string | null {
  const value = input.replace(/[\s-]/g, "").toUpperCase();
  return value === "" ? null : value;
}

export const ISRC_PATTERN = /^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/;

// "FRZ032600001" → "FR-Z03-26-00001" (country, registrant, year, code).
export function formatIsrc(isrc: string): string {
  return `${isrc.slice(0, 2)}-${isrc.slice(2, 5)}-${isrc.slice(5, 7)}-${isrc.slice(7)}`;
}

// "3:07" → 187, "1:02:03" → 3723. Undefined when the text is not a duration,
// null when empty.
export function parseDuration(input: string): number | null | undefined {
  const value = input.trim();
  if (value === "") return null;
  const match = /^(?:(\d{1,2}):)?(\d{1,3}):([0-5]\d)$/.exec(value);
  if (!match) return undefined;
  const [, hours, minutes, seconds] = match;
  const total =
    Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds);
  return total >= 1 && total < 86400 ? total : undefined;
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

// Main credits joined by commas, featurings after "feat.".
export function formatCredits(
  credits: ReadonlyArray<{ name: string; role: CreditRole }>,
): string {
  const main = credits.filter((c) => c.role === "main").map((c) => c.name);
  const featuring = credits
    .filter((c) => c.role === "featuring")
    .map((c) => c.name);
  const head = main.join(", ");
  if (featuring.length === 0) return head;
  return head
    ? `${head} feat. ${featuring.join(", ")}`
    : `feat. ${featuring.join(", ")}`;
}

export function isCreditRole(value: unknown): value is CreditRole {
  return (
    typeof value === "string" &&
    (CREDIT_ROLES as readonly string[]).includes(value)
  );
}

// "Sauvéé (Instrumental)" for any variant but the original.
export function masterLabel(master: {
  title: string;
  variant: Variant;
  variantLabel: string | null;
}): string {
  const variant = variantText(master);
  return variant ? `${master.title} (${variant})` : master.title;
}
