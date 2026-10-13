// The format of a deliverable (MKT-C2-06): the questions it is asked depend
// on it — a clip is not a cover. Decided by code from the deliverable's
// title and lever, never by a model; « other » keeps the generic questions.
// Client-safe.

export const DELIVERABLE_FORMATS = [
  "clip",
  "cover",
  "short",
  "campaign",
  "other",
] as const;
export type DeliverableFormat = (typeof DELIVERABLE_FORMATS)[number];

// Checked in this order: « Teaser vidéo TikTok » is a short, not a clip.
const RULES: Array<[DeliverableFormat, RegExp]> = [
  ["short", /tiktok|reel|short|snack|story|stories|vertical/i],
  ["cover", /cover|pochette|artwork|visuel de sortie|single art/i],
  ["clip", /clip|vid[ée]o|film|lyric|visualizer|teaser/i],
  ["campaign", /campagne|ads?\b|publicit|affich|bannière|banner|ooh/i],
];

export function deliverableFormat(
  title: string,
  leverLabel: string | null,
): DeliverableFormat {
  const text = `${title} ${leverLabel ?? ""}`;
  return RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? "other";
}
