// What changed between two contents of the Brief créatif (MKT-C2-12): the
// parts that differ, by their names — « à jour » and « obsolète » are said
// from visible differences, and a new version shows what it changes.
// Client-safe.

import type { CreativeBriefContent } from "@/lib/design/brief";
import { conceptionDirection } from "@/lib/i18n/fr/conception-direction";

const fr = { conceptionDirection };

const PARTS = [
  "identity",
  "context",
  "objectives",
  "audiences",
  "narrative",
  "principles",
  "tone",
  "showAvoid",
  "coherence",
  "deliverables",
  "excluded",
  "references",
  "constraints",
  "decisions",
  "sources",
  "openPoints",
] as const;
type Part = (typeof PARTS)[number];

const stable = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  ) ?? "";

/** The names of the parts that differ, in the Brief's order. */
export function briefChanges(
  before: CreativeBriefContent,
  after: CreativeBriefContent,
): string[] {
  const names: Record<Part, string> = {
    ...fr.conceptionDirection.brief.sections,
    identity: fr.conceptionDirection.brief.identity.title,
    excluded: fr.conceptionDirection.brief.sections.deliverables,
  };
  const changed = PARTS.filter(
    (part) =>
      stable(before[part as keyof CreativeBriefContent]) !==
      stable(after[part as keyof CreativeBriefContent]),
  ).map((part) => names[part]);
  return [...new Set(changed)];
}
