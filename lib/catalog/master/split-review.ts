// Where a split of a title stands, apart from its total (retours Catalogue
// 15, 44, 46, 48, 52 et 53 du 11/10/2026, docs/ARCHITECTURE.md § 2 sexies,
// « Répartitions »). « Complet » is the arithmetic only; a validation is a
// snapshot of the lines taken by the legal side, and lines changed since
// leave that snapshot as the validated version. Pure, client-safe.

import {
  splitTotal,
  type MasterContributor,
  type MasterSplit,
  type SplitKind,
  type SplitRole,
} from "@/lib/catalog/master/rules";
import { normalizeSearch } from "@/lib/utils/search";

export type SplitLine = {
  party: string;
  role: SplitRole | string;
  share: number;
  contactId: string | null;
  artistId: string | null;
};

export type SplitValidation = {
  id: string;
  kind: SplitKind;
  lines: SplitLine[];
  validatedAt: string;
  validatorName: string;
};

/**
 * En préparation (not at 100 %), À vérifier (complete, never validated),
 * Validée (the lines are the validated ones), Modifiée depuis la validation
 * (a validation exists, the lines changed since: to validate again).
 */
export type SplitReviewState =
  "preparing" | "to_check" | "validated" | "changed";

const key = (line: SplitLine) =>
  [
    line.party.trim(),
    line.role,
    Math.round(line.share * 100),
    line.contactId ?? "",
    line.artistId ?? "",
  ].join("|");

const sameLines = (a: SplitLine[], b: SplitLine[]) => {
  if (a.length !== b.length) return false;
  const left = a.map(key).sort();
  const right = b.map(key).sort();
  return left.every((value, index) => value === right[index]);
};

export function toSplitLines(splits: MasterSplit[]): SplitLine[] {
  return splits.map((s) => ({
    party: s.party,
    role: s.role,
    share: s.share,
    contactId: s.contactId ?? null,
    artistId: s.artistId ?? null,
  }));
}

export function splitReviewState(
  splits: MasterSplit[],
  kind: SplitKind,
  latest: SplitValidation | null,
): SplitReviewState {
  const rows = splits.filter((s) => s.kind === kind);
  if (latest && sameLines(toSplitLines(rows), latest.lines)) return "validated";
  if (latest) return "changed";
  return splitTotal(splits, kind).status === "complete"
    ? "to_check"
    : "preparing";
}

// Credited roles that usually carry a share of the work.
const RIGHTS_ROLES = new Set(["composer", "lyricist", "arranger"]);

export type SplitGap = { name: string; roles: string[] };

/**
 * People credited with a creative role (composer, lyricist, arranger) who
 * have no visible share of the publishing (retour 52): said, to check,
 * never a share proposed nor added. Matched by their contact, else by name.
 */
export function publishingGaps(
  contributors: MasterContributor[],
  splits: MasterSplit[],
): SplitGap[] {
  const shares = splits.filter((s) => s.kind === "publishing");
  const contacts = new Set(shares.flatMap((s) => s.contactId ?? []));
  const names = new Set(shares.map((s) => normalizeSearch(s.party)));
  const gaps = new Map<string, SplitGap>();
  for (const c of contributors) {
    if (!RIGHTS_ROLES.has(c.role)) continue;
    if (c.contactId ? contacts.has(c.contactId) : false) continue;
    if (names.has(normalizeSearch(c.name))) continue;
    const id = c.contactId ?? normalizeSearch(c.name);
    const gap = gaps.get(id) ?? { name: c.name, roles: [] };
    if (!gap.roles.includes(c.role)) gap.roles.push(c.role);
    gaps.set(id, gap);
  }
  return [...gaps.values()];
}
