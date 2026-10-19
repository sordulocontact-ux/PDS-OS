import "server-only";

import { cache } from "react";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { LINK_KEY, linkKeyArgs } from "@/lib/portal/link-key";

// The provider's space as its public page sees it, read through
// get_production_provider_space(token): the database checks the token, its
// expiry and its replacement by a newer link (PROD-026).

export const TOKEN = LINK_KEY;

const text = z.string().nullable();

const spaceSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("open"),
    expiresAt: z.string(),
    writable: z.boolean(),
    provider: z.string(),
    project: z.string(),
    deliverable: z.string(),
    manager: text,
    steps: z.array(
      z.object({
        id: z.string(),
        key: z.string(),
        label: text,
        responsibilities: text,
        accessNote: text,
        startsOn: text,
        endsOn: text,
        status: z.string(),
      }),
    ),
    references: z.array(
      z.object({
        kind: z.string(),
        title: text,
        url: text,
        note: text,
        fileName: text,
      }),
    ),
    requests: z.array(
      z.object({
        id: z.string(),
        versionNumber: z.number(),
        dueOn: z.string(),
        message: text,
        status: z.string(),
        sentAt: text,
        comments: z.array(
          z.object({
            timecodeMs: z.number().nullable(),
            category: z.string(),
            body: z.string(),
            status: z.string(),
          }),
        ),
      }),
    ),
    versions: z.array(
      z.object({
        number: z.number(),
        status: z.string(),
        url: text,
        fileName: text,
        mine: z.boolean(),
        submittedAt: text,
        createdAt: z.string(),
      }),
    ),
    exports: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        kind: z.string(),
        url: text,
        result: text,
        note: text,
        // What is expected of the file, its failing points (PROD-035, 037).
        spec: text.optional().default(null),
        failed: z
          .array(z.object({ key: z.string(), note: text }))
          .optional()
          .default([]),
      }),
    ),
    approved: z.boolean(),
  }),
  z.object({ state: z.enum(["replaced", "expired"]) }),
]);

export type ProviderSpace = z.infer<typeof spaceSchema>;
export type OpenProviderSpace = Extract<ProviderSpace, { state: "open" }>;

/** Null for an unknown token. Read once per request. */
export const getProviderSpace = cache(
  async (token: string): Promise<ProviderSpace | null> => {
    if (!TOKEN.test(token)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "get_production_provider_space",
      linkKeyArgs(token),
    );
    if (error) {
      console.error("getProviderSpace:", error.message);
      return null;
    }
    if (!data) return null;
    const parsed = spaceSchema.safeParse(data);
    if (!parsed.success) {
      console.error("getProviderSpace: unexpected shape");
      return null;
    }
    return parsed.data;
  },
);

/** The page was opened: the requests sent to this provider read
 * « consultée » (PROD-031). */
export async function noteProviderOpened(token: string): Promise<void> {
  if (!TOKEN.test(token)) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("note_production_provider_opened", {
    ...linkKeyArgs(token),
  });
  if (error) console.error("noteProviderOpened:", error.message);
}

const locationsSchema = z.object({
  role: z.enum(["artistic", "technical", "production"]).nullable(),
  options: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      address: text,
      url: text,
      availability: text,
      constraints: text,
      media: z.array(z.string()),
      files: z.number(),
      review: z
        .object({
          verdict: z.enum(["favorable", "reserved", "unfavorable"]),
          comment: text,
        })
        .nullable(),
    }),
  ),
});
export type ProviderLocations = z.infer<typeof locationsSchema>;

/** The places a consulted provider gives an opinion on (PROD-012). */
export async function getProviderLocations(
  token: string,
): Promise<ProviderLocations | null> {
  if (!TOKEN.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_production_provider_locations",
    linkKeyArgs(token),
  );
  if (error) console.error("getProviderLocations:", error.message);
  const parsed = locationsSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
