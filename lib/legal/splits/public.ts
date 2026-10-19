import "server-only";

import { cache } from "react";
import { z } from "zod";

import { SPLIT_ROLES } from "@/lib/legal/splits/shares";
import { createClient } from "@/lib/supabase/server";
import { LINK_KEY, linkKeyArgs } from "@/lib/portal/link-key";

/** A split confirmation as its public page sees it, read through
 * get_split_confirmation(token): the database checks the token, its expiry,
 * its revocation and whether the version is still the active one. */

const publicSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("open"),
    project: z.string(),
    person: z.string(),
    position: z.number(),
    hash: z.string(),
    content: z.object({
      version: z.number(),
      title: z.string(),
      entries: z.array(
        z.object({
          name: z.string(),
          role: z.enum(SPLIT_ROLES),
          share: z.string(),
        }),
      ),
    }),
  }),
  z.object({ state: z.enum(["confirmed", "disputed", "expired", "revoked"]) }),
]);

export type PublicSplit = z.infer<typeof publicSchema>;

const TOKEN = LINK_KEY;

export const getPublicSplit = cache(
  async (token: string): Promise<PublicSplit | null> => {
    if (!TOKEN.test(token)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_split_confirmation", {
      ...linkKeyArgs(token),
    });
    if (error) {
      console.error("getPublicSplit:", error.message);
      return null;
    }
    const parsed = publicSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  },
);
