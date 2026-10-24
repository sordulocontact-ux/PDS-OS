import "server-only";

import { cache } from "react";
import { z } from "zod";

import { FORM_ROLES } from "@/lib/legal/forms/definition";
import { createClient } from "@/lib/supabase/server";
import { LINK_KEY, linkKeyArgs } from "@/lib/portal/link-key";

/** A fiche as its public page sees it, read through get_legal_form(token):
 * the database checks the token, its expiry and revocation. */

// Who asks: the organization and the project's owner (email when known).
const requesterSchema = z
  .object({
    organization: z.string().nullable().default(null),
    contact: z.string().nullable().default(null),
    email: z.string().nullable().default(null),
  })
  .catch({ organization: null, contact: null, email: null })
  .default({ organization: null, contact: null, email: null });

export type FormRequester = z.infer<typeof requesterSchema>;

const publicSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("open"),
    version: z.number(),
    person: z.string(),
    project: z.string(),
    requester: requesterSchema,
    // What PDS OS knows: the roles to tick, and answers to confirm (nom
    // d'artiste, nom à créditer, catégorie).
    prefill: z
      .object({
        roles: z.array(z.enum(FORM_ROLES)).default([]),
        answers: z.record(z.string(), z.string()).default({}),
      })
      .catch({ roles: [], answers: {} }),
    known: z
      .record(z.string(), z.unknown())
      .transform((known) =>
        Object.fromEntries(
          Object.entries(known).flatMap(([k, v]) =>
            typeof v === "string" ? [[k, v]] : [],
          ),
        ),
      ),
  }),
  // The team asked for what is missing (JUR-06): only those fields.
  z.object({
    state: z.literal("complement"),
    person: z.string(),
    project: z.string(),
    requester: requesterSchema,
    missing: z.array(z.string()).default([]),
    note: z.string().nullable().default(null),
    known: z
      .record(z.string(), z.unknown())
      .transform((known) =>
        Object.fromEntries(
          Object.entries(known).flatMap(([k, v]) =>
            typeof v === "string" ? [[k, v]] : [],
          ),
        ),
      ),
  }),
  z.object({
    state: z.enum(["submitted", "expired", "revoked"]),
    requester: requesterSchema,
  }),
]);

export type PublicForm = z.infer<typeof publicSchema>;

const TOKEN = LINK_KEY;

/** Null when the token is malformed or unknown. */
export const getPublicForm = cache(
  async (token: string): Promise<PublicForm | null> => {
    if (!TOKEN.test(token)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_legal_form", {
      ...linkKeyArgs(token),
    });
    if (error) {
      console.error("getPublicForm:", error.message);
      return null;
    }
    const parsed = publicSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  },
);

/**
 * The person opened their link (JUR-11): noted once by the database, never
 * read as an answer. A failure only loses that mark.
 */
export async function noteFormOpened(token: string): Promise<void> {
  if (!TOKEN.test(token)) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("note_legal_form_opened", {
    ...linkKeyArgs(token),
  });
  if (error) console.error("noteFormOpened:", error.message);
}
