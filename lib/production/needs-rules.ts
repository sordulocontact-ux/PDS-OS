import "server-only";

import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { prepFailure, type PrepResult } from "@/lib/production/prep-result";
import {
  hasSpeciality,
  isRoleOf,
  MAX_HEADCOUNT,
  NEED_FAMILIES,
} from "@/lib/production/roles";

// What lib/production/needs-actions.ts checks before writing, and how it
// reads the database's refusals. Same rules as the database
// (supabase/migrations/20261010003001_production_preparation.sql).

const t = fr.productionNeeds.errors;

export const invalidNeed: PrepResult = {
  ok: false,
  error: fr.productionPrep.errors.invalid,
};
export const needNotFound: PrepResult = { ok: false, error: t.notFound };
// No row written: RLS hid it (not the owner, or the stage no longer runs).
export const needForbidden: PrepResult = {
  ok: false,
  error: fr.productionPrep.errors.forbidden,
};

/** The needs' own refusals first, then the preparation's. */
export function needsFailure(error: {
  code?: string;
  message?: string;
}): PrepResult {
  const message = error.message ?? "";
  if (message.includes("need_full")) return { ok: false, error: t.needFull };
  if (message.includes("headcount_below_assigned"))
    return { ok: false, error: t.headcountBelowAssigned };
  if (message.includes("person_not_member"))
    return { ok: false, error: t.notMember };
  if (message.includes("contact_not_found"))
    return { ok: false, error: t.contactNotFound };
  if (error.code === "23505") return { ok: false, error: t.alreadyAssigned };
  return prepFailure(error);
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

export const needFields = z.object({
  projectId: z.uuid(),
  family: z.enum(NEED_FAMILIES),
  roleKey: z.string(),
  label: optionalText(120),
  speciality: optionalText(120),
  headcount: z.coerce.number().int().min(1).max(MAX_HEADCOUNT),
  note: optionalText(1000),
});

// A preset position of the family, or « other » with its label; a
// speciality only for a performer.
export const needSchema = needFields
  .refine((n) => isRoleOf(n.family, n.roleKey))
  .refine((n) => n.roleKey !== "other" || n.label !== null)
  .transform((n) => ({
    ...n,
    label: n.roleKey === "other" ? n.label : null,
    speciality: hasSpeciality(n.family) ? n.speciality : null,
  }));

export type NeedInput = z.input<typeof needFields>;

export const needRef = z.object({ projectId: z.uuid(), needId: z.uuid() });

const availability = z.enum(["to_confirm", "available", "unavailable"]);

export const assignSchema = needRef.extend({
  // "person:<uuid>" (a member) or "contact:<uuid>" (the Réseau).
  holder: z.string().trim().max(80),
  availability,
  note: optionalText(500),
});

/** The holder's kind and id, or null when the value is not one. */
export function parseHolder(
  value: string,
): { kind: "person" | "contact"; id: string } | null {
  const [kind, id] = value.split(":");
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success || (kind !== "person" && kind !== "contact")) return null;
  return { kind, id: parsed.data };
}

export const assignmentRef = z.object({
  projectId: z.uuid(),
  assignmentId: z.uuid(),
});

export const availabilitySchema = assignmentRef.extend({
  availability,
  note: optionalText(500),
});
