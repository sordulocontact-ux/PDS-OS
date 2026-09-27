// Types of a "Cadre & contraintes" line; mirror the check constraint of
// public.framing_constraints. Labels in fr.framingGuide.frame.types.
// Client-safe.

export const CONSTRAINT_TYPES = [
  "budget",
  "production",
  "artistic",
  "rights",
  "other",
] as const;

export type ConstraintType = (typeof CONSTRAINT_TYPES)[number];

export function isConstraintType(value: string): value is ConstraintType {
  return (CONSTRAINT_TYPES as readonly string[]).includes(value);
}
