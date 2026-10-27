// The needs and activations of the Cadrage as chips (dimension Objectif,
// « Ce qu'il faut produire »): the presets of each group, then the needs
// typed by hand or heard in a call. Decided by code. Client-safe.

import { NEED_PRESETS } from "@/lib/framing/needs-presets";
import type { FramingData } from "@/lib/framing/queries";
import { framing } from "@/lib/i18n/fr/framing";

const fr = { framing };

/** Promotion & diffusion needs are "activations"; everything else is a need. */
export const isActivation = (family: string) =>
  family === "promotion_distribution";

export const NEED_GROUPS = {
  needs: ["creation_content", "experiences_activations"],
  activations: ["promotion_distribution"],
} as const;
export type NeedGroup = keyof typeof NEED_GROUPS;

export type NeedChip = {
  key: string;
  label: string;
  family: string;
  need: FramingData["needs"][number] | null;
};

const normalize = (s: string) => s.trim().toLowerCase();

/** Preset chips of a group, then the group's needs typed by hand or by a call. */
export function needChips(
  needs: FramingData["needs"],
  group: NeedGroup,
): NeedChip[] {
  const presetLabels: Record<string, string> = fr.framing.needs.presets;
  const families: readonly (keyof typeof NEED_PRESETS)[] = NEED_GROUPS[group];
  // A need of family "other" sits with the needs, never with the activations.
  const inGroup = needs.filter((n) =>
    group === "activations" ? isActivation(n.family) : !isActivation(n.family),
  );
  const presets = families.flatMap((family) =>
    (NEED_PRESETS[family] as readonly string[]).map((preset) => {
      const label = presetLabels[preset];
      return {
        key: preset,
        label,
        family,
        need:
          inGroup.find((n) => normalize(n.label) === normalize(label)) ?? null,
      };
    }),
  );
  const taken = new Set(presets.map((p) => normalize(p.label)));
  const extra = inGroup
    .filter((n) => !taken.has(normalize(n.label)))
    .map((n) => ({ key: n.id, label: n.label, family: n.family, need: n }));
  return [...presets, ...extra];
}
