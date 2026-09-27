// Master page: values, types and pure helpers. Client-safe. Every enum
// mirrors a check of supabase/migrations/20260927003001_master_page.sql.

import type { FieldErrors, FormValues } from "@/lib/auth/form-state";

export const SESSION_KINDS = [
  "recording",
  "production",
  "mixing",
  "mastering",
  "other",
] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export const CONTRIBUTOR_ROLES = [
  "composer",
  "lyricist",
  "arranger",
  "producer",
  "co_producer",
  "recording_engineer",
  "mix_engineer",
  "mastering_engineer",
  "musician",
  "other",
] as const;
export type ContributorRole = (typeof CONTRIBUTOR_ROLES)[number];

export const SPLIT_KINDS = ["master", "publishing"] as const;
export type SplitKind = (typeof SPLIT_KINDS)[number];

export const SPLIT_ROLES = [
  "label",
  "artist",
  "producer",
  "author",
  "composer",
  "publisher",
  "other",
] as const;
export type SplitRole = (typeof SPLIT_ROLES)[number];

export const ORGANISMS = [
  "sacem",
  "scpp",
  "sppf",
  "adami",
  "spedidam",
] as const;
export type Organism = (typeof ORGANISMS)[number];

export const DECLARATION_STATUSES = [
  "submitted",
  "confirmed",
  "rejected",
] as const;
export type DeclarationStatus = (typeof DECLARATION_STATUSES)[number];

/** Narrows a database string to one of `values`, else `fallback`. */
export function oneOf<T extends string>(
  values: readonly T[],
  value: string,
  fallback: T,
): T {
  return (values as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export type MasterSession = {
  id: string;
  kind: SessionKind;
  date: string | null;
  studio: string | null;
  engineer: string | null;
  notes: string | null;
};

export type MasterTrack = {
  id: string;
  name: string;
  performer: string | null;
  sessionId: string | null;
};

export type MasterContributor = {
  id: string;
  name: string;
  role: ContributorRole;
  detail: string | null;
};

export type MasterSplit = {
  id: string;
  kind: SplitKind;
  party: string;
  role: SplitRole;
  // In percent, two decimals at most.
  share: number;
};

export type MasterDeclaration = {
  id: string;
  organism: Organism;
  status: DeclarationStatus;
  reference: string | null;
  date: string | null;
  notes: string | null;
};

export type MasterRights = {
  iswc: string | null;
  rightsHolder: string | null;
  rightsYear: number | null;
};

// Shares are summed in hundredths: 33.33 + 33.33 + 33.34 is exactly 100.
const toHundredths = (share: number) => Math.round(share * 100);

export type SplitTotal = {
  total: number;
  remaining: number;
  status: "empty" | "incomplete" | "complete";
};

/** Total and remainder of one kind of split. Pure code, never the model's. */
export function splitTotal(splits: MasterSplit[], kind: SplitKind): SplitTotal {
  const hundredths = splits
    .filter((s) => s.kind === kind)
    .reduce((sum, s) => sum + toHundredths(s.share), 0);
  return {
    total: hundredths / 100,
    remaining: Math.max(0, 10000 - hundredths) / 100,
    status:
      hundredths === 0
        ? "empty"
        : hundredths >= 10000
          ? "complete"
          : "incomplete",
  };
}

const percentFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});

/** "33,33 %". */
export function formatShare(share: number): string {
  return `${percentFormat.format(share)} %`;
}

/** "T-034.524.680-1" → "T0345246801", or null when it is not an ISWC. */
export function normalizeIswc(value: string): string | null {
  const compact = value.toUpperCase().replace(/[\s.\-]/g, "");
  return /^T[0-9]{10}$/.test(compact) ? compact : null;
}

/** "T0345246801" → "T-034.524.680-1". */
export function formatIswc(iswc: string): string {
  return `${iswc[0]}-${iswc.slice(1, 4)}.${iswc.slice(4, 7)}.${iswc.slice(7, 10)}-${iswc[10]}`;
}

/** "℗ 2026 PDS", or null while the holder is unknown. */
export function pLine(rights: MasterRights): string | null {
  if (!rights.rightsHolder) return null;
  return ["℗", rights.rightsYear, rights.rightsHolder]
    .filter(Boolean)
    .join(" ");
}

// State of the master page forms (useActionState).
export type MasterFormState =
  | { status: "idle" }
  | {
      status: "error";
      formError?: string;
      fieldErrors?: FieldErrors;
      values?: FormValues;
    }
  | { status: "saved" };

export const idleMasterFormState: MasterFormState = { status: "idle" };

// Sections whose rows are deleted by deleteMasterItem.
export const MASTER_ITEM_SECTIONS = [
  "session",
  "track",
  "contributor",
  "split",
  "declaration",
] as const;
export type MasterItemSection = (typeof MASTER_ITEM_SECTIONS)[number];
