import "server-only";

import {
  arenaChannelsOf,
  getArenaChannel,
  type ArenaChannel,
} from "@/lib/integrations/arena";
import type { ExternalImage } from "@/lib/integrations/images";
import type { ArenaLink, SimilarGroup } from "@/lib/design/similar-rules";

// Are.na « by rebound » (free, no search by words): from an image already
// chosen — kept from Are.na in the moodboard, or pasted — to the channels
// people saved it in, then the other images of those channels.

const MAX_CHANNELS = 4;
const CHANNELS_PER_SEED = 4;

/** The channels to open: the pasted one first, then those of each seed. */
export async function arenaChannelsFor(
  seeds: string[],
  link: ArenaLink | null,
): Promise<ArenaChannel[]> {
  const pasted =
    link?.kind === "channel" ? await getArenaChannel(link.slug) : null;
  const blocks = link?.kind === "block" ? [link.id, ...seeds] : seeds;
  const found = await Promise.all(
    [...new Set(blocks)].map((id) => arenaChannelsOf(id, CHANNELS_PER_SEED)),
  );
  // Round-robin over the seeds: each one gets its channels in, in turn.
  const channels = new Map<number, ArenaChannel>();
  if (pasted) channels.set(pasted.id, pasted);
  for (let i = 0; i < CHANNELS_PER_SEED; i++)
    for (const list of found)
      if (list[i] && !channels.has(list[i].id))
        channels.set(list[i].id, list[i]);
  return [...channels.values()].slice(0, MAX_CHANNELS);
}

/** One proposal group per channel (its images not yet in the project). */
export function arenaGroup(
  channel: ArenaChannel,
  images: ExternalImage[],
): SimilarGroup {
  return {
    key: `arena:${channel.id}`,
    source: "arena",
    label: channel.title,
    images: images.map((image) => ({ ...image, source: "arena" })),
  };
}
