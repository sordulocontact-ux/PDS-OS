import "server-only";

import { cache } from "react";
import { z } from "zod";

import { PLATFORMS } from "@/lib/release/platforms";
import { isUuid } from "@/lib/release/uuid";
import { createClient } from "@/lib/supabase/server";

/** Public smartlink, read anonymously through get_smartlink(token). */

const smartlinkSchema = z.object({
  title: z.string(),
  artist: z.string(),
  links: z.array(
    z.object({
      platform: z.enum(PLATFORMS),
      url: z.url({ protocol: /^https$/ }),
    }),
  ),
});

export type Smartlink = z.infer<typeof smartlinkSchema>;

// Display order on the public page, most used first.
const ORDER = new Map<string, number>(
  [
    "spotify",
    "appleMusic",
    "deezer",
    "youtubeMusic",
    "amazonMusic",
    "tidal",
    "youtube",
    "soundcloud",
  ].map((platform, index) => [platform, index]),
);

/** Null when the token is malformed, unknown or the smartlink disabled. */
export const getSmartlink = cache(
  async (token: string): Promise<Smartlink | null> => {
    if (!isUuid(token)) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_smartlink", {
      p_token: token,
    });
    if (error) throw new Error(`get_smartlink: ${error.message}`);
    if (data === null) return null;
    const parsed = smartlinkSchema.safeParse(data);
    if (!parsed.success) return null;
    return {
      ...parsed.data,
      links: parsed.data.links.toSorted(
        (a, b) => (ORDER.get(a.platform) ?? 99) - (ORDER.get(b.platform) ?? 99),
      ),
    };
  },
);
