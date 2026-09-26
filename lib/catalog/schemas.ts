import { z } from "zod";

import { CONTACT_ROLES } from "@/lib/catalog/contacts";
import { COUNTRY_CODES } from "@/lib/catalog/countries";
import {
  CREDIT_ROLES,
  ISRC_PATTERN,
  normalizeIsrc,
  parseDuration,
} from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

const e = fr.auth.errors;
const me = fr.catalog.masterForm.errors;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: e.tooLong })
    .optional()
    .transform((value) => (value ? value : null));

export const createArtistSchema = z.object({
  name: z
    .string({ error: e.required })
    .trim()
    .min(1, { error: e.required })
    .max(200, { error: e.tooLong }),
  notes: optionalText(5000),
  // Only the id travels: the server reads the picture and link from Deezer.
  deezerId: z
    .string()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || /^[1-9]\d{0,14}$/.test(value), {
      error: fr.catalog.artistForm.deezerInvalid,
    })
    .transform((value) => (value === null ? null : Number(value))),
});

export const artistSearchSchema = z.string().trim().min(2).max(100);

// Credits travel as one JSON field (FormData flattens repeated keys).
const creditsSchema = z
  .string()
  .optional()
  .transform((raw, ctx) => {
    try {
      return JSON.parse(raw || "[]") as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: me.artistsRequired });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(z.object({ artistId: z.uuid(), role: z.enum(CREDIT_ROLES) }), {
        error: me.artistsRequired,
      })
      .min(1, { error: me.artistsRequired })
      .max(20, { error: e.tooLong })
      .refine(
        (credits) =>
          new Set(credits.map((c) => c.artistId)).size === credits.length,
        { error: me.artistsRequired },
      ),
  );

export const createMasterSchema = z.object({
  title: z
    .string({ error: e.required })
    .trim()
    .min(1, { error: e.required })
    .max(200, { error: e.tooLong }),
  credits: creditsSchema,
  version: optionalText(100),
  isrc: z
    .string()
    .optional()
    .transform((value) => normalizeIsrc(value ?? ""))
    .refine((value) => value === null || ISRC_PATTERN.test(value), {
      error: me.isrcInvalid,
    }),
  duration: z
    .string()
    .optional()
    .transform((value, ctx) => {
      const seconds = parseDuration(value ?? "");
      if (seconds === undefined) {
        ctx.addIssue({ code: "custom", message: me.durationInvalid });
        return z.NEVER;
      }
      return seconds;
    }),
});

export const catalogIdSchema = z.uuid();

const pe = fr.catalog.profileForm.errors;

export const updateArtistSchema = z.object({
  artistId: z.uuid(),
  name: createArtistSchema.shape.name,
  legalName: optionalText(200),
  countryCode: z
    .string()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || COUNTRY_CODES.has(value), {
      error: pe.country,
    }),
  // Empty = back to the biography read from Deezer / Wikipedia.
  bio: optionalText(5000),
  notes: optionalText(5000),
});

export const contactSchema = z.object({
  artistId: z.uuid(),
  // Absent when adding a contact.
  contactId: z
    .string()
    .optional()
    .transform((value) => (value ? value : null))
    .pipe(z.uuid().nullable()),
  role: z.enum(CONTACT_ROLES, { error: e.required }),
  name: z
    .string({ error: e.required })
    .trim()
    .min(1, { error: e.required })
    .max(200, { error: e.tooLong }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320, { error: e.tooLong })
    .optional()
    .transform((value) => (value ? value : null))
    .pipe(z.email({ error: e.invalidEmail }).nullable()),
  phone: optionalText(40).refine(
    (value) => value === null || /^[0-9+(). -]{3,40}$/.test(value),
    { error: pe.phone },
  ),
  isPrimary: z
    .string()
    .optional()
    .transform((value) => value === "on"),
});

export const contactRefSchema = z.object({
  artistId: z.uuid(),
  contactId: z.uuid(),
});
