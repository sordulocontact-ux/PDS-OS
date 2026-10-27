// Common levers of a release (ticket Stratégie § 3: social organique,
// influence, RP / médias, pitching playlists, partenariats…), offered by
// code in one click; each lands « à arbitrer », the owner decides. Labels in
// fr.strategyDispositif.presets. Client-safe.

import { strategyDispositif } from "@/lib/i18n/fr/strategy-dispositif";

const fr = { strategyDispositif };

type Family =
  | "creation_content"
  | "promotion_distribution"
  | "experiences_activations"
  | "other";

export const LEVER_PRESETS = [
  { key: "organic_social", family: "promotion_distribution" },
  { key: "influence", family: "promotion_distribution" },
  { key: "press", family: "promotion_distribution" },
  { key: "playlist_pitching", family: "promotion_distribution" },
  { key: "partnerships", family: "experiences_activations" },
  { key: "paid_ads", family: "promotion_distribution" },
  { key: "radio", family: "promotion_distribution" },
  { key: "live", family: "experiences_activations" },
  { key: "video", family: "creation_content" },
] as const satisfies ReadonlyArray<{ key: string; family: Family }>;

export type LeverPreset = (typeof LEVER_PRESETS)[number];

const normalize = (label: string) =>
  label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

/** The presets not yet among the project's levers (by label). */
export function availablePresets(
  levers: Array<{ label: string }>,
): Array<LeverPreset & { label: string }> {
  const taken = new Set(levers.map((l) => normalize(l.label)));
  return LEVER_PRESETS.map((p) => ({
    ...p,
    label: fr.strategyDispositif.presets[p.key],
  })).filter((p) => !taken.has(normalize(p.label)));
}
