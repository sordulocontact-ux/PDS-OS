// Common needs offered as one-click chips, grouped by family: faster than
// typing a label by hand for the usual cases. Labels live in
// lib/i18n/fr/framing.ts (needs.presets); "Autre" always falls back to the
// free-text field. Client-safe.

import type { FAMILIES } from "@/lib/framing/actions/shared";

type Family = (typeof FAMILIES)[number];

export const NEED_PRESETS = {
  creation_content: [
    "clip",
    "social_content",
    "cover_visual_identity",
    "photoshoot",
  ],
  promotion_distribution: [
    "press_relations",
    "influence_campaign",
    "playlisting",
    "marketing_campaign",
  ],
  experiences_activations: ["live_showcase", "event"],
  other: [],
} as const satisfies Record<Family, readonly string[]>;

export type NeedPresetKey<F extends Family> = (typeof NEED_PRESETS)[F][number];
