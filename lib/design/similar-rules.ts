import type { ConceptionReference } from "@/lib/design/conception";
import { targetKeyOf } from "@/lib/design/reference-rules";
import type { ExternalImage } from "@/lib/integrations/images";

// « Chercher des références semblables »: what the screen and the server
// share. Client-safe (the image type is erased at build).

// The base « Toutes les images » of the moodboard, beside the targets' keys.
export const ALL_IMAGES = "all";

// The images PO can read: small enough for one message, in a format the
// model takes (no AVIF, no PDF, no video).
export const READABLE_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
export const MAX_READABLE_BYTES = 5 * 1024 * 1024;

export function isReadableImage(
  r: Pick<ConceptionReference, "kind" | "mime" | "bytes">,
): boolean {
  return (
    r.kind === "file" &&
    READABLE_IMAGE_MIMES.includes(r.mime ?? "") &&
    (r.bytes ?? Infinity) <= MAX_READABLE_BYTES
  );
}

/**
 * The moodboards PO can start from: each target with readable images, then
 * all of them when they span more than one target (or none yet).
 */
export function similarBases(
  references: ConceptionReference[],
  targets: Array<{ key: string; label: string }>,
  allLabel: string,
): Array<{ key: string; label: string; count: number }> {
  const images = references.filter(isReadableImage);
  const perTarget = targets.flatMap((target) => {
    const count = images.filter((r) =>
      r.links.some((l) => targetKeyOf(l) === target.key),
    ).length;
    return count > 0 ? [{ ...target, count }] : [];
  });
  const all = { key: ALL_IMAGES, label: allLabel, count: images.length };
  if (images.length === 0) return [];
  return perTarget.length === 1 && perTarget[0].count === images.length
    ? perTarget
    : [...perTarget, all];
}

// Where an image comes from: Are.na by rebound (the channels holding an
// image already chosen), Openverse by PO's searches.
export type SimilarSource = "arena" | "openverse";
export type SimilarImage = ExternalImage & { source: SimilarSource };

/** One set of proposals: an Are.na channel, or one search on Openverse. */
export type SimilarGroup = {
  key: string;
  source: SimilarSource;
  label: string;
  images: SimilarImage[];
};

export const similarKey = (source: SimilarSource, id: string) =>
  `${source}:${id}`;

// A reference kept from a source carries the image's address in its note:
// that is how a later search leaves it out, and where Are.na rebounds from.
const ADDRESSES: Array<[SimilarSource, RegExp]> = [
  ["arena", /are\.na\/block\/(\d+)/g],
  ["openverse", /openverse\.org\/image\/([0-9a-f-]{36})/g],
];

export function keptKeysIn(notes: Array<string | null>): Set<string> {
  const keys = new Set<string>();
  for (const note of notes)
    for (const [source, pattern] of ADDRESSES)
      for (const match of (note ?? "").matchAll(pattern))
        keys.add(similarKey(source, match[1]));
  return keys;
}

/** An Are.na address pasted by a person: an image, or a channel. */
export type ArenaLink =
  { kind: "block"; id: string } | { kind: "channel"; slug: string };

export function parseArenaLink(value: string): ArenaLink | null {
  const text = value.trim();
  if (!text) return null;
  const block = text.match(/are\.na\/block\/(\d{1,12})/);
  if (block) return { kind: "block", id: block[1] };
  // https://www.are.na/<user>/<channel-slug>
  const channel = text.match(
    /^https:\/\/(?:www\.)?are\.na\/[a-z0-9-]+\/([a-z0-9-]{1,120})\/?(?:[?#].*)?$/i,
  );
  return channel ? { kind: "channel", slug: channel[1].toLowerCase() } : null;
}
