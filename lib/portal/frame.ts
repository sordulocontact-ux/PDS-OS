import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// The frame of a private page (C13 A): the project, its artist and format,
// the person the link is for, the project's owner (« Votre contact chez
// PDS »). Read by token, without an account (get_private_link_frame).

export type PortalKind = "master" | "form" | "split" | "influence" | "provider";

const text = z.string().nullable().catch(null);
const schema = z.object({
  project: z.string(),
  artist: text,
  format: text,
  person: text,
  role: text,
  owner: text,
  ownerRole: text,
});
export type PortalFrame = z.infer<typeof schema>;

export const getPortalFrame = trackedCache(
  async (kind: PortalKind, token: string): Promise<PortalFrame | null> => {
    if (!/^[0-9a-f]{64}$/.test(token)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_private_link_frame", {
      p_kind: kind,
      p_token: token,
    });
    if (error) console.error("getPortalFrame:", error.message);
    const parsed = schema.safeParse(data);
    return parsed.success ? parsed.data : null;
  },
);
