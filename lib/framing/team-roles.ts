// Fixed team roles offered on the "Équipe projet" screen, one per need
// preset that requires a person to run it. Not every need has a role (a
// "Shooting photo" need has no dedicated role card): only the ones the
// business always staffs. Labels live in lib/i18n/fr/framing.ts (team.roles).
// Client-safe.

export const TEAM_ROLE_KEYS = [
  "artistic_direction",
  "creative_direction",
  "clip_production",
  "press_relations",
  "influence_marketing",
  "playlisting",
] as const;

export type TeamRoleKey = (typeof TEAM_ROLE_KEYS)[number];

// A role always offered, regardless of needs (the two directions run every
// release), plus roles unlocked by a confirmed need preset.
export const ALWAYS_OFFERED_ROLES: readonly TeamRoleKey[] = [
  "artistic_direction",
  "creative_direction",
];

// Keyed by the need preset key (lib/framing/needs-presets.ts), not its label:
// a need's label may have been edited by hand, but a preset key is stable.
// A need added from a preset carries no trace of which preset it came from
// today, so the match falls back to the preset's own label (below).
export const ROLE_OF_NEED_PRESET: Record<string, TeamRoleKey> = {
  clip: "clip_production",
  press_relations: "press_relations",
  influence_campaign: "influence_marketing",
  playlisting: "playlisting",
};

/**
 * Roles to show as cards: always-offered ones, plus one per confirmed need
 * whose label matches a preset with a role. `presetLabels` maps each preset
 * key to its French label (fr.framing.needs.presets), the only stable link
 * between a free-text need and the preset it was likely added from.
 */
export function rolesForNeeds(
  needLabels: string[],
  presetLabels: Record<string, string>,
): TeamRoleKey[] {
  const normalize = (s: string) => s.trim().toLowerCase();
  const roleOfLabel = new Map(
    Object.entries(ROLE_OF_NEED_PRESET).flatMap(([preset, role]) => {
      const label = presetLabels[preset];
      return label ? [[normalize(label), role] as const] : [];
    }),
  );
  const fromNeeds = needLabels.flatMap((label) => {
    const role = roleOfLabel.get(normalize(label));
    return role ? [role] : [];
  });
  return [...new Set([...ALWAYS_OFFERED_ROLES, ...fromNeeds])];
}
