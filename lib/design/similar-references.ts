import "server-only";

import { extractFromImages } from "@/lib/ai/llm";
import { MOODBOARD_READING_INSTRUCTIONS } from "@/lib/ai/instructions/moodboard-reading";
import { moodboardReadingSchema } from "@/lib/ai/schemas/moodboard-reading";
import type { Supabase } from "@/lib/design/reference-db";
import { REFERENCE_BUCKET, targetKeyOf } from "@/lib/design/reference-rules";
import { arenaChannelsFor, arenaGroup } from "@/lib/design/similar-arena";
import {
  ALL_IMAGES,
  MAX_READABLE_BYTES,
  READABLE_IMAGE_MIMES,
  keptKeysIn,
  similarKey,
  type ArenaLink,
  type SimilarGroup,
} from "@/lib/design/similar-rules";
import {
  ARENA_ENABLED,
  similarSetup,
  wordCalls,
} from "@/lib/design/similar-sources";
import { arenaChannelImages } from "@/lib/integrations/arena";

// « Chercher des références semblables » (Conception, étape 6): PO reads a
// few images of the moodboard and proposes searches (Unsplash) and tags
// (Tumblr); the sources on are asked (similar-sources.ts), Are.na also by
// rebound when it is on. The code drops what the project already holds.
// Nothing is written here: a human picks.

const MAX_IMAGES = 4;
const MAX_SEARCHES = 4;
const PER_SEARCH = 12;
const PER_CHANNEL = 16;
const ARENA_SEEDS = 3;

type Row = {
  path: string | null;
  mime: string | null;
  bytes: number | null;
  note: string | null;
  design_reference_links: Array<{ design_deliverable_id: string | null }>;
};

/** The project's references, latest first. */
async function projectReferences(
  supabase: Supabase,
  projectId: string,
): Promise<Row[]> {
  const { data, error } = await supabase
    .from("design_references")
    .select(
      "path, mime, bytes, note, design_reference_links(design_deliverable_id)",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`projectReferences: ${error.message}`);
  return data ?? [];
}

const inBase = (base: string) => (r: Row) =>
  base === ALL_IMAGES ||
  r.design_reference_links.some(
    (l) => targetKeyOf({ deliverableId: l.design_deliverable_id }) === base,
  );

// A search is a few plain words: no quotes, no sentence, no duplicate.
export function cleanSearches(searches: string[]): string[] {
  const seen = new Set<string>();
  return searches
    .map((s) =>
      s
        .replace(/["«»“”]/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((s) => {
      const key = s.toLowerCase();
      if (!s || s.length > 60 || s.split(" ").length > 6 || seen.has(key))
        return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_SEARCHES);
}

export type MoodboardWords = { searches: string[]; tags: string[] };

/** What PO sees in the base's latest images; null when none is read. */
export async function readMoodboard(
  supabase: Supabase,
  projectId: string,
  base: string,
): Promise<({ look: string } & MoodboardWords) | null> {
  // PO reads only when its words have somewhere to run.
  if (!similarSetup().reads) return null;
  const rows = (await projectReferences(supabase, projectId))
    .filter(
      (r) =>
        r.path !== null &&
        READABLE_IMAGE_MIMES.includes(r.mime ?? "") &&
        (r.bytes ?? Infinity) <= MAX_READABLE_BYTES,
    )
    .filter(inBase(base))
    .slice(0, MAX_IMAGES);
  const images = await Promise.all(
    rows.map(async (r) => {
      const { data: blob } = await supabase.storage
        .from(REFERENCE_BUCKET)
        .download(r.path ?? "");
      return blob && r.mime
        ? { data: new Uint8Array(await blob.arrayBuffer()), mediaType: r.mime }
        : null;
    }),
  );
  const readable = images.flatMap((i) => (i ? [i] : []));
  if (readable.length === 0) return null;
  const reading = await extractFromImages(
    moodboardReadingSchema,
    readable,
    MOODBOARD_READING_INSTRUCTIONS,
  );
  return {
    look: reading.output.look.trim(),
    searches: cleanSearches(reading.output.searches),
    tags: cleanSearches(reading.output.tags),
  };
}

/**
 * The proposals: one group per search or tag of each source on (and per
 * Are.na channel when it is on); each image once, never one the project
 * already kept. One failed call does not sink the others; null = nothing to
 * start from.
 */
export async function searchSimilar(
  supabase: Supabase,
  projectId: string,
  input: MoodboardWords & { base: string; link: ArenaLink | null },
): Promise<SimilarGroup[] | null> {
  const rows = await projectReferences(supabase, projectId);
  const kept = keptKeysIn(rows.map((r) => r.note));
  // Are.na rebounds from the images already kept from it in this base.
  const arenaSeeds = ARENA_ENABLED
    ? [...keptKeysIn(rows.filter(inBase(input.base)).map((r) => r.note))]
        .filter((key) => key.startsWith("arena:"))
        .map((key) => key.slice("arena:".length))
        .slice(0, ARENA_SEEDS)
    : [];
  const link = ARENA_ENABLED ? input.link : null;
  const words = similarSetup().reads
    ? { searches: input.searches, tags: input.tags }
    : { searches: [], tags: [] };
  if (
    arenaSeeds.length === 0 &&
    !link &&
    words.searches.length + words.tags.length === 0
  )
    return null;

  const channels =
    arenaSeeds.length || link
      ? await arenaChannelsFor(arenaSeeds, link).catch((error: unknown) => {
          console.error("searchSimilar (Are.na channels):", error);
          return [];
        })
      : [];
  const calls: Array<Promise<SimilarGroup>> = [
    ...channels.map((channel) =>
      arenaChannelImages(channel.id).then((images) =>
        arenaGroup(channel, images),
      ),
    ),
    ...wordCalls(words),
  ];
  const settled = await Promise.allSettled(calls);
  const failed = settled.find((s) => s.status === "rejected");
  if (failed && settled.every((s) => s.status === "rejected"))
    throw failed.reason;

  const seen = new Set(kept);
  return settled.flatMap((s) => {
    if (s.status === "rejected") return [];
    const max = s.value.source === "arena" ? PER_CHANNEL : PER_SEARCH;
    const images = s.value.images
      .filter((image) => {
        const key = similarKey(image.source, image.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, max);
    // A channel of links and texts only proposes nothing: no empty pill.
    return images.length > 0 ? [{ ...s.value, images }] : [];
  });
}
