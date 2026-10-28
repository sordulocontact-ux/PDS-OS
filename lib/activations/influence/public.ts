import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";
import { z } from "zod";

import { agreementContentSchema } from "@/lib/activations/influence/agreement-content";
import { createClient } from "@/lib/supabase/server";
import { LINK_KEY, linkKeyArgs } from "@/lib/portal/link-key";

/** The express agreement as its public page sees it, read through
 * get_influence_agreement(token) : the database checks the token, expiry and
 * revocation, and notes the first display. */

const publicSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("open"),
    hash: z.string(),
    content: agreementContentSchema,
  }),
  z.object({
    state: z.enum(["accepted", "change_requested", "revoked", "expired"]),
  }),
]);

export type PublicAgreement = z.infer<typeof publicSchema>;

export const getPublicAgreement = trackedCache(
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
