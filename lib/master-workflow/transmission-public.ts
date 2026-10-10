import "server-only";

import { cache } from "react";
import { z } from "zod";

import { masterPackageSchema } from "@/lib/master-workflow/transmission-types";
import { createClient } from "@/lib/supabase/server";

/** The package as its public page sees it, read through
 * get_master_transmission(token): the database checks the token, its
 * expiry and its replacement by a newer sending. */

const publicSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.enum(["open", "received"]),
    package: masterPackageSchema,
    note: z.string().nullable(),
    sentAt: z.string(),
    expiresAt: z.string(),
    acknowledgedAt: z.string().nullable(),
    // The syntheses sent for the versions of the mix, newest first.
    feedback: z
      .array(
        z.object({
          title: z.string(),
          number: z.number(),
          summary: z.string(),
          sentAt: z.string(),
        }),
      )
      .default([]),
    // What the engineer deposited through this link, newest first.
    deliveries: z
      .array(
        z.object({
          masterId: z.string(),
          fileName: z.string(),
          sentAt: z.string(),
        }),
      )
      .default([]),
  }),
  z.object({ state: z.enum(["replaced", "expired"]) }),
]);

export type PublicPackage = z.infer<typeof publicSchema>;

export const TOKEN = /^[0-9a-f]{64}$/;

/** Null when the token is malformed or unknown. */
export const getPublicPackage = cache(
  async (token: string): Promise<PublicPackage | null> => {
    if (!TOKEN.test(token)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_master_transmission", {
      p_token: token,
    });
    if (error) {
      console.error("getPublicPackage:", error.message);
      return null;
    }
    const parsed = publicSchema.safeParse(data);
    if (!parsed.success && data)
      console.error("getPublicPackage: unreadable package");
    return parsed.success ? parsed.data : null;
  },
);
