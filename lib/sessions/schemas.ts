import { z } from "zod";

import {
  sessionFieldsShape,
  sessionTimesIssue,
  sessionTimesOk,
} from "@/lib/catalog/master/schemas";
import { auth } from "@/lib/i18n/fr/auth";
import { sessions } from "@/lib/i18n/fr/sessions";

const fr = { auth, sessions };
const e = fr.auth.errors;

// "" = none (a new session), else the session edited.
const optionalId = z
  .string()
  .optional()
  .transform((value) => (value ? value : null))
  .pipe(z.uuid().nullable());

/** A JSON list of ids, as OptionSelect `multiple` and AttendeeChips send. */
const jsonIds = z
  .string()
  .optional()
  .transform((value, ctx) => {
    try {
      const parsed = z
        .array(z.uuid())
        .max(50)
        .safeParse(JSON.parse(value || "[]"));
      if (parsed.success) return [...new Set(parsed.data)];
    } catch {}
    ctx.addIssue({ code: "custom", message: e.required });
    return z.NEVER;
  });

/** The titles of a session: the Catalogue's (ids) and the titles of a
 * collective not in the Catalogue yet (`pt:` + id, lot 7). */
const jsonTitleIds = z
  .string()
  .optional()
  .transform((value, ctx) => {
    try {
      const parsed = z
        .array(z.union([z.uuid(), z.string().regex(/^pt:[0-9a-f-]{36}$/)]))
        .max(50)
        .safeParse(JSON.parse(value || "[]"));
      if (parsed.success) return [...new Set(parsed.data)];
    } catch {}
    ctx.addIssue({ code: "custom", message: e.required });
    return z.NEVER;
  });

/** The Réseau contacts AttendeeChips sends in `guests` (typed addresses left out). */
const jsonContacts = z
  .string()
  .optional()
  .transform((value) => {
    try {
      const list: unknown = JSON.parse(value || "[]");
      if (!Array.isArray(list)) return [];
      return [
        ...new Set(
          list.flatMap((guest) => {
            const id = z.object({ contactId: z.uuid() }).safeParse(guest);
            return id.success ? [id.data.contactId] : [];
          }),
        ),
      ].slice(0, 50);
    } catch {
      return [];
    }
  });

export const studioSessionSchema = z
  .object({
    ...sessionFieldsShape,
    sessionId: optionalId,
    artistIds: jsonIds,
    // Chosen when the session is created; then from its page.
    titleIds: jsonTitleIds,
    projectIds: jsonIds,
    attendees: jsonIds,
    guests: jsonContacts,
  })
  .refine(sessionTimesOk, sessionTimesIssue())
  // Tied first to its artists (Ibé, 06/11/2026): a session can come before
  // any project.
  .refine((v) => v.artistIds.length > 0, {
    error: fr.sessions.form.artistRequired,
    path: ["artistIds"],
  });

/** A short part of the report, null when left empty. */
const reportPart = z
  .string()
  .optional()
  .transform((value) => value?.trim() || null)
  .refine((value) => value === null || value.length <= 2000, {
    error: e.tooLong,
  });

export const sessionReportSchema = z.object({
  sessionId: z.uuid(),
  reportNotes: z
    .string({ error: e.required })
    .trim()
    .min(1, { error: e.required })
    .max(5000, { error: e.tooLong }),
  reportTakeaways: reportPart,
  reportNextStep: reportPart,
  attendees: jsonIds,
  guests: jsonContacts,
});

export const sessionLinkSchema = z.object({
  sessionId: z.uuid(),
  label: z
    .string({ error: e.required })
    .trim()
    .min(1, { error: e.required })
    .max(200, { error: e.tooLong }),
  url: z
    .string({ error: e.required })
    .trim()
    .max(2000, { error: e.tooLong })
    .refine((value) => /^https:\/\/\S+$/.test(value), {
      error: fr.sessions.links.urlInvalid,
    }),
});

export const sessionDemoSchema = z.object({
  sessionId: z.uuid(),
  title: z
    .string({ error: e.required })
    .trim()
    .min(1, { error: e.required })
    .max(200, { error: e.tooLong }),
  artistId: z.uuid({ error: e.required }),
});

export const sessionAttachSchema = z.object({
  sessionId: z.uuid(),
  masterId: z.uuid({ error: e.required }),
});
