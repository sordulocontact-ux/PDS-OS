import { z } from "zod";

import {
  CONTRIBUTOR_ROLES,
  DECLARATION_STATUSES,
  MASTER_ITEM_SECTIONS,
  ORGANISMS,
  SESSION_KINDS,
  SPLIT_KINDS,
  SPLIT_ROLES,
  roleFitsKind,
  normalizeIswc,
} from "@/lib/catalog/master/rules";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";

// Forms of the master page. Every rule is also a check in SQL.
const e = fr.auth.errors;
const t = fr.masterPage;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: e.tooLong })
    .optional()
    .transform((value) => (value ? value : null));

const requiredText = (max: number) =>
  z
    .string({ error: e.required })
    .trim()
    .min(1, { error: e.required })
    .max(max, { error: e.tooLong });

// "" = none; otherwise a plain YYYY-MM-DD from a date input.
const optionalDate = z
  .string()
  .optional()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    error: e.required,
  });

// The row being edited, absent when adding.
const optionalId = z
  .string()
  .optional()
  .transform((value) => (value ? value : null))
  .pipe(z.uuid().nullable());

const base = { masterId: catalogIdSchema, itemId: optionalId };

export const sessionSchema = z.object({
  ...base,
  kind: z.enum(SESSION_KINDS, { error: e.required }),
  date: optionalDate,
  studio: optionalText(200),
  engineer: optionalText(200),
  notes: optionalText(2000),
});

export const trackSchema = z.object({
  ...base,
  name: requiredText(200),
  performer: optionalText(200),
  // "none" = not tied to a session.
  sessionId: z
    .string()
    .optional()
    .transform((value) => (value && value !== "none" ? value : null))
    .pipe(z.uuid().nullable()),
});

// A JSON list sent by a client control (hidden input).
const jsonList = <T extends z.ZodType>(item: T, message: string) =>
  z
    .string()
    .optional()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw || "[]") as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
    })
    .pipe(z.array(item, { error: message }));

// One person and all their roles on the title (UX test of 09/10/2026); the
// rows of that person when editing (one per role).
export const contributorSchema = z.object({
  masterId: catalogIdSchema,
  itemIds: jsonList(z.uuid(), e.required).pipe(z.array(z.uuid()).max(20)),
  name: requiredText(200),
  roles: jsonList(
    z.enum(CONTRIBUTOR_ROLES),
    t.credits.fields.rolesRequired,
  ).pipe(
    z
      .array(z.enum(CONTRIBUTOR_ROLES))
      .min(1, { error: t.credits.fields.rolesRequired })
      .max(CONTRIBUTOR_ROLES.length),
  ),
  detail: optionalText(200),
  // The person picked from the Réseau; empty for a name only.
  contactId: optionalId,
});

// "contact:<id>" or "artist:<id>": who a share is, picked; "" for a name only.
const partyRef = z
  .string()
  .optional()
  .transform((value) => value || null)
  .refine(
    (value) => value === null || /^(contact|artist):[0-9a-f-]{36}$/.test(value),
    {
      error: e.required,
    },
  );

export const splitSchema = z
  .object({
    ...base,
    kind: z.enum(SPLIT_KINDS, { error: e.required }),
    party: requiredText(200),
    partyRef,
    role: z.enum(SPLIT_ROLES, { error: e.required }),
    // "33,33" or "33.33": at most two decimals, between 0.01 and 100.
    share: z
      .string({ error: t.splits.errors.share })
      .trim()
      .transform((value) => value.replace(",", ".").replace(/\s|%/g, ""))
      .refine((value) => /^\d{1,3}(\.\d{1,2})?$/.test(value), {
        error: t.splits.errors.share,
      })
      .transform(Number)
      .refine((value) => value > 0 && value <= 100, {
        error: t.splits.errors.share,
      }),
  })
  // A role of its kind only (retour 43).
  .refine((input) => roleFitsKind(input.role, input.kind), {
    path: ["role"],
    error: t.splits.errors.roleKind,
  });

export const declarationSchema = z.object({
  masterId: catalogIdSchema,
  organism: z.enum(ORGANISMS),
  status: z.enum(DECLARATION_STATUSES, { error: e.required }),
  reference: optionalText(100),
  date: optionalDate,
  notes: optionalText(2000),
  // Retours 60 and 61: who follows it, and its proof (a file of the title).
  thirdParty: optionalText(200),
  proofFileId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "none" ? v : null))
    .pipe(catalogIdSchema.nullable()),
});

export const rightsSchema = z.object({
  masterId: catalogIdSchema,
  iswc: z
    .string()
    .trim()
    .optional()
    .transform((value, ctx) => {
      if (!value) return null;
      const iswc = normalizeIswc(value);
      if (!iswc) {
        ctx.addIssue({ code: "custom", message: t.rights.errors.iswc });
        return z.NEVER;
      }
      return iswc;
    }),
  rightsHolder: optionalText(200),
  rightsYear: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value) : null))
    .refine(
      (value) =>
        value === null ||
        (Number.isInteger(value) && value >= 1900 && value <= 2100),
      { error: t.rights.errors.year },
    ),
});

export const deleteItemSchema = z.object({
  masterId: catalogIdSchema,
  section: z.enum(MASTER_ITEM_SECTIONS),
  itemId: z.uuid(),
  // The other rows of the same person (a contributor's other roles).
  alsoIds: z.array(z.uuid()).max(20).optional(),
});
