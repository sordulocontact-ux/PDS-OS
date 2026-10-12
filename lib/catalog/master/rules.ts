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

// The final list of the Catalogue's feedback (retour 63): « À effectuer » is
// a real status, « Non applicable » takes a declaration out of the file.
export const DECLARATION_STATUSES = [
  "to_verify",
  "to_do",
  "submitted",
  "confirmed",
  "to_correct",
  "rejected",
  "not_applicable",
] as const;
export type DeclarationStatus = (typeof DECLARATION_STATUSES)[number];

// Filed with the organism (or nothing more to do): what counts as done.
const DECLARATION_DONE: ReadonlySet<DeclarationStatus> = new Set([
  "submitted",
  "confirmed",
]);

/**
 * Where a title's declarations stand (retours 14 and 61): only the
 * applicable ones count. An organism with no declaration noted, or « À
 * vérifier », is still to qualify (applicable or not); « Non applicable »
 * is out of the file. Pure.
 */
export function declarationsSummary(
  rows: Array<{ organism: Organism; status: DeclarationStatus }>,
): { done: number; applicable: number; toQualify: number } {
  const byOrganism = new Map(rows.map((r) => [r.organism, r.status]));
  let done = 0;
  let applicable = 0;
  let toQualify = 0;
  for (const organism of ORGANISMS) {
    const status = byOrganism.get(organism);
    if (!status || status === "to_verify") toQualify += 1;
    else if (status !== "not_applicable") {
      applicable += 1;
      if (DECLARATION_DONE.has(status)) done += 1;
    }
  }
  return { done, applicable, toQualify };
}

/** Confirmed with its proof attached: a confirmation verified, not only
 * said (retour 59). */
export const declarationVerified = (d: {
  status: DeclarationStatus;
  proofFileId: string | null;
}) => d.status === "confirmed" && d.proofFileId !== null;

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
  // Its contact of the Réseau, once linked.
  contactId: string | null;
};

export type MasterSplit = {
  id: string;
  kind: SplitKind;
  party: string;
  role: SplitRole;
  // In percent, two decimals at most.
  share: number;
  // Who it is, when known: a contact of the Réseau or an artist of the
  // catalog (at most one); null for a name only.
  contactId?: string | null;
  artistId?: string | null;
};

export type MasterDeclaration = {
  id: string;
  organism: Organism;
  status: DeclarationStatus;
  reference: string | null;
  date: string | null;
  notes: string | null;
  // Who follows it when a third party does (retour 61).
  thirdParty: string | null;
  // The proof: a file of the title (retour 60).
  proofFileId: string | null;
};

export type MasterRights = {
  iswc: string | null;
  rightsHolder: string | null;
  rightsYear: number | null;
  // A person confirmed the holder and year (retours 54 and 58); null while
  // it is only proposed, or since one of them changed.
  confirmedAt?: string | null;
  confirmedBy?: string | null;
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
