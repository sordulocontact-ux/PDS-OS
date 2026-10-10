// Conception, étape 6: a reference stays a proposal until it is validated
// with the artistic direction. Computed by code from what the validators
// decided on a submitted version, never stored (CLAUDE.md, rule 6).
// Client-safe: the direction's screens use it too.

export type ReferenceStatus = "proposed" | "validated";

/** One submission of the direction, as read in the database. */
export type DirectionVersion = {
  mode: string;
  // design_submissions.snapshot: one entry per section submitted.
  snapshot: unknown;
  // design_decisions of the version: '' = the whole version (global mode).
  decisions: Array<{ section: string; decision: string }>;
};

type SnapshotSection = { section: string; referenceIds: string[] };

function sectionsOf(snapshot: unknown): SnapshotSection[] {
  if (!Array.isArray(snapshot)) return [];
  return snapshot.flatMap((entry: unknown) => {
    if (typeof entry !== "object" || entry === null) return [];
    const { section, references } = entry as Record<string, unknown>;
    if (typeof section !== "string" || !Array.isArray(references)) return [];
    const referenceIds = references.flatMap((r: unknown) =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as { id?: unknown }).id === "string"
        ? [(r as { id: string }).id]
        : [],
    );
    return [{ section, referenceIds }];
  });
}

/**
 * The references that appear in an approved section of any version of the
 * direction: in global mode, an approval of the whole version covers every
 * section it carries; per section, only the sections approved.
 */
export function validatedReferenceIds(
  versions: DirectionVersion[],
): Set<string> {
  const validated = new Set<string>();
  for (const version of versions) {
    const approved = new Set(
      version.decisions
        .filter((d) => d.decision === "approved")
        .map((d) => d.section),
    );
    const wholeApproved = approved.has("");
    for (const section of sectionsOf(version.snapshot)) {
      if (!wholeApproved && !approved.has(section.section)) continue;
      for (const id of section.referenceIds) validated.add(id);
    }
  }
  return validated;
}

export function referenceStatusOf(
  referenceId: string,
  validated: Set<string>,
): ReferenceStatus {
  return validated.has(referenceId) ? "validated" : "proposed";
}
