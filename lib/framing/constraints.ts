// Types of a constraint line; mirror the check constraint of
// public.framing_constraints. « Budget & contraintes » shows them as
// financial (budget), creative (artistic), human and operational
// (production); rights lines belong to « Cadre juridique ». Labels in
// fr.framingIntel.constraintTypes.
// Client-safe.

export const CONSTRAINT_TYPES = [
  "budget",
  "production",
  "artistic",
  "human",
  "rights",
  "other",
] as const;

export type ConstraintType = (typeof CONSTRAINT_TYPES)[number];

export function isConstraintType(value: string): value is ConstraintType {
  return (CONSTRAINT_TYPES as readonly string[]).includes(value);
}
