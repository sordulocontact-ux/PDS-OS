import "server-only";

import { cache } from "react";
import { z } from "zod";

import { FORM_ROLES } from "@/lib/legal/forms/definition";
import { createClient } from "@/lib/supabase/server";

/** A fiche as its public page sees it, read through get_legal_form(token):
 * the database checks the token, its expiry and revocation. */

const publicSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("open"),
    version: z.number(),
    person: z.string(),
    project: z.string(),
    prefill: z
      .object({ roles: z.array(z.enum(FORM_ROLES)).default([]) })
      .catch({ roles: [] }),
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
  z.object({ state: z.enum(["submitted", "expired", "revoked"]) }),
]);

export type PublicForm = z.infer<typeof publicSchema>;

const TOKEN = /^[0-9a-f]{64}$/;

/** Null when the token is malformed or unknown. */
export const getPublicForm = cache(
  async (token: string): Promise<PublicForm | null> => {
    if (!TOKEN.test(token)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_legal_form", {
      p_token: token,
    });
    if (error) {
      console.error("getPublicForm:", error.message);
      return null;
    }
    const parsed = publicSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  },
);
