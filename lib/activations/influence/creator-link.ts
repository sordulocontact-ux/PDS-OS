import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { LINK_KEY, linkKeyArgs } from "@/lib/portal/link-key";

/**
 * The collaboration as the creator's private link shows it once « Bon pour
 * accord » is given (get_influence_collaboration): where it stands for her,
 * her own terms, her versions with the feedback, her publication. The
 * database checks the token; nothing of another collaboration, no internal
 * note.
 */
const schema = z.object({
  step: z.enum([
    "content",
    "review",
    "publish",
    "published",
    "invoice",
    "closed",
  ]),
  creator: z.string().nullable(),
  campaign: z.string().nullable(),
  project: z.string().nullable(),
  terms: z
    .object({
      fee: z.number().nullable(),
      currency: z.string().nullable(),
      deliverables: z.string().nullable(),
    })
    .partial()
    .nullable(),
  agreedAt: z.string().nullable(),
  contents: z.array(
    z.object({
      label: z.string(),
      url: z.string().nullable(),
      decision: z.string().nullable(),
      comment: z.string().nullable(),
      at: z.string(),
      feedback: z.array(
        z.object({
          timecode: z.string().nullable(),
          category: z.string().nullable(),
          comment: z.string().nullable(),
        }),
      ),
    }),
  ),
  publication: z
    .object({
      url: z.string().nullable(),
      on: z.string().nullable(),
      verified: z.boolean(),
    })
    .nullable(),
  invoiceSent: z.boolean(),
});

export type CreatorCollaboration = z.infer<typeof schema>;

export const getCreatorCollaboration = trackedCache(
  async (token: string): Promise<CreatorCollaboration | null> => {
    if (!LINK_KEY.test(token)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_influence_collaboration", {
      ...linkKeyArgs(token),
    });
    if (error) {
      console.error("getCreatorCollaboration:", error.message);
      return null;
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success && data)
      console.error("getCreatorCollaboration: shape", parsed.error.message);
    return parsed.success ? parsed.data : null;
  },
);
