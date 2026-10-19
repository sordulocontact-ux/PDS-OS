// What an element gathered in the Conception is (MKT-C2-09): a reference
// (inspiration) or a moodboard (an organised selection); « to_qualify » for
// what was gathered before the rule. Creative proposals are design_versions,
// work versions belong to Production. Same lists as the database
// (…20261013100501_reference_types.sql). Client-safe.

export const REFERENCE_TYPES = [
  "reference",
  "moodboard",
  "proposal",
  "work_version",
  "to_qualify",
] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

// The two a person chooses; « à qualifier » is never chosen.
export const CHOSEN_REFERENCE_TYPES = ["reference", "moodboard"] as const;

export const REFERENCE_USAGES = [
  "free",
  "internal",
  "to_check",
  "inspiration",
  "licensed",
  "to_license",
  "owned",
] as const;
export type ReferenceUsage = (typeof REFERENCE_USAGES)[number];

export function referenceTypeOf(value: string | null): ReferenceType {
  return REFERENCE_TYPES.find((t) => t === value) ?? "to_qualify";
}

export function referenceUsageOf(value: string | null): ReferenceUsage | null {
  return REFERENCE_USAGES.find((u) => u === value) ?? null;
}

// The proto's words (« Projet complet », refAddForm): the four sorts and the
// three rights a person picks now; « À vérifier » by default.
export const PROTO_REFERENCE_TYPES = [
  "reference",
  "moodboard",
  "proposal",
  "work_version",
] as const;
export type ProtoReferenceType = (typeof PROTO_REFERENCE_TYPES)[number];
export const PROTO_REFERENCE_USAGES = ["free", "internal", "to_check"] as const;
