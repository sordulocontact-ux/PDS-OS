import "server-only";

import { cache } from "react";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { LINK_KEY, linkKeyArgs } from "@/lib/portal/link-key";

/** The express agreement as its public page sees it, read through
 * get_influence_agreement(token) : the database checks the token, expiry and
 * revocation, and notes the first display. */

const rightsSchema = z.object({
  kind: z.enum(["organic", "ads"]),
  platforms: z.array(z.string()),
  supports: z.string().nullable(),
  territory: z.string().nullable(),
  starts_on: z.string().nullable(),
  ends_on: z.string().nullable(),
  remuneration: z.enum(["included", "additional"]),
  remuneration_note: z.string().nullable(),
  modification_allowed: z.boolean(),
  credit_required: z.boolean(),
  restrictions: z.string().nullable(),
});

const publicSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("open"),
    hash: z.string(),
    content: z.object({
      project: z.string(),
      campaign: z.string(),
      creator: z.string(),
      terms: z.object({
        fee: z.number().nullable(),
        currency: z.string(),
        deliverables: z.string().nullable(),
        schedule: z.string().nullable(),
        organic_usage: z.string().nullable(),
        ads_usage: z.string().nullable(),
        exclusivity: z.string().nullable(),
        expenses: z.string().nullable(),
        conditions: z.string().nullable(),
      }),
      rights: z.array(rightsSchema),
    }),
  }),
  z.object({
    state: z.enum(["accepted", "change_requested", "revoked", "expired"]),
  }),
]);

export type PublicAgreement = z.infer<typeof publicSchema>;

export const getPublicAgreement = cache(
  async (token: string): Promise<PublicAgreement | null> => {
    if (!LINK_KEY.test(token)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_influence_agreement", {
      ...linkKeyArgs(token),
    });
    if (error) {
      console.error("getPublicAgreement:", error.message);
      return null;
    }
    const parsed = publicSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  },
);
