import { z } from "zod";

import { CONTACT_ROLES } from "@/lib/catalog/contacts";
import { COUNTRY_CODES } from "@/lib/catalog/countries";
import { CONTRIBUTOR_ROLES } from "@/lib/catalog/master/rules";
import {
  ARTIST_RELATIONS,
  CREDIT_ROLES,
  ISRC_PATTERN,
  normalizeIsrc,
  parseDuration,
} from "@/lib/catalog/types";
import {
  AUDIO_STATES,
  DEFAULT_VARIANT,
  UNKNOWN_AUDIO_STATE,
  VARIANTS,
} from "@/lib/catalog/title-rules";
import { auth } from "@/lib/i18n/fr/auth";
import { catalog } from "@/lib/i18n/fr/catalog";

const fr = { auth, catalog };

const e = fr.auth.errors;
const me = fr.catalog.masterForm.errors;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: e.tooLong })
    .optional()
    .transform((value) => (value ? value : null));

// Always chosen by a person: no default on either side.
const relationSchema = z.enum(ARTIST_RELATIONS, {
  error: fr.catalog.relation.required,
});

export const createArtistSchema = z.object({
  relation: relationSchema,
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
  // The main contact, chosen on the same screen (UX test of 09/10/2026):
  // a person of the Réseau or a name; none when left empty.
  contactRole: z
    .string()
    .optional()
    .transform((value) => value || "manager")
    .pipe(z.enum(CONTACT_ROLES, { error: e.required })),
  contactNetworkContactId: z
    .string()
    .optional()
    .transform((value) => (value ? value : null))
    .pipe(z.uuid().nullable()),
  contactName: optionalText(200),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(320, { error: e.tooLong })
    .optional()
    .transform((value) => (value ? value : null))
    .pipe(z.email({ error: e.invalidEmail }).nullable()),
  contactPhone: optionalText(40).refine(
    (value) => value === null || /^[0-9+(). -]{3,40}$/.test(value),
    { error: fr.catalog.profileForm.errors.phone },
  ),
});

// A name, or a pasted Deezer link (share links carry tracking parameters).
export const artistSearchSchema = z.string().trim().min(2).max(300);

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

// A title: its name and main artist are the only required fields
// (docs/ARCHITECTURE.md § 2 septies).
// The credits entered with a new title (UX test of 09/10/2026): one person
// of the Réseau (or a name) and all their roles.
const contributorsSchema = z
  .string()
  .optional()
  .transform((raw, ctx) => {
    try {
      return JSON.parse(raw || "[]") as unknown;
    } catch {
      ctx.addIssue({
        code: "custom",
        message: fr.catalog.masterForm.credits.invalid,
      });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(
        z.object({
          name: z.string().trim().min(1).max(200),
          contactId: z.uuid().nullable(),
          roles: z
            .array(z.enum(CONTRIBUTOR_ROLES))
            .min(1)
            .max(CONTRIBUTOR_ROLES.length),
        }),
        { error: fr.catalog.masterForm.credits.invalid },
      )
      .max(30, { error: e.tooLong }),
  );

export const createMasterSchema = z.object({
  title: z
    .string({ error: e.required })
    .trim()
    .min(1, { error: e.required })
    .max(200, { error: e.tooLong }),
  credits: creditsSchema,
  contributors: contributorsSchema,
  // Empty or "Non renseigné" = unknown, never guessed.
  audioState: z
    .string()
    .optional()
    .transform((value) =>
      value && value !== UNKNOWN_AUDIO_STATE ? value : null,
    )
    .pipe(z.enum(AUDIO_STATES, { error: me.audioStateInvalid }).nullable()),
  variant: z
    .string()
    .optional()
    .transform((value) => value || DEFAULT_VARIANT)
    .pipe(z.enum(VARIANTS, { error: me.variantInvalid })),
  // Only kept for "Autre": create_master drops it otherwise.
  variantLabel: optionalText(100),
  // « Nouvelle variante »: the original it is a variant of (retour 08).
  variantOf: z
    .string()
    .optional()
    .transform((value) => value || null)
    .pipe(z.uuid().nullable()),
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
  relation: relationSchema,
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
  // The person of the Réseau, when picked there; empty for a name only.
  networkContactId: z
    .string()
    .optional()
    .transform((value) => (value ? value : null))
    .pipe(z.uuid().nullable()),
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
