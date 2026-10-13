// Where a stored version of the Brief créatif stands (MKT-C2-12), computed
// by code from the version, the latest one, whether the project moved
// since, and the Conception's validation. Client-safe.

import type { fr } from "@/lib/i18n/fr";

export type BriefStatus =
  keyof typeof fr.conceptionDirection.brief.document.statuses;

export function briefStatus({
  number,
  latest,
  changed,
  stageState,
}: {
  number: number;
  latest: number;
  // The live content differs from the latest version.
  changed: boolean;
  // stage_instances.state of the Conception.
  stageState: string | null;
}): BriefStatus {
  if (number !== latest) return "superseded";
  if (stageState === "validated") return "validated";
  if (stageState === "awaiting_validation") return "in_review";
  return changed ? "outdated" : "current";
}

/** Why the validation of the dossier is not asked yet, or null. */
export function briefRequestBlock(
  latest: number | null,
  changed: boolean,
  t: typeof fr.conceptionDirection.brief.document,
): string | null {
  if (latest === null) return t.requestNeedsBrief;
  return changed ? t.requestNeedsUpToDate(latest) : null;
}
