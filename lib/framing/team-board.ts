// The "Équipe projet" screen as cards: one per role the needs call for, filled
// or open, decided by code (never by PO). Client-safe.

import type { FramingData } from "@/lib/framing/queries";
import {
  TEAM_ROLE_KEYS,
  rolesForNeeds,
  type TeamRoleKey,
} from "@/lib/framing/team-roles";
import { fr } from "@/lib/i18n/fr";

type TeamRow = FramingData["team"][number];

export type RoleCard = { role: TeamRoleKey; member: TeamRow | null };

const isRoleKey = (value: string | null): value is TeamRoleKey =>
  value !== null && (TEAM_ROLE_KEYS as readonly string[]).includes(value);

/**
 * Cards in a fixed order: the always-offered roles, the roles unlocked by the
 * needs, and any role already given to someone (a need removed since keeps
 * its person visible). People with no fixed role are listed apart.
 */
export function teamBoard(
  team: FramingData["team"],
  needs: FramingData["needs"],
  context: { music?: boolean } = {},
): { roles: RoleCard[]; others: TeamRow[] } {
  const wanted = new Set<TeamRoleKey>(
    rolesForNeeds(
      needs.map((n) => n.label),
      fr.framing.needs.presets,
      context,
    ),
  );
  for (const member of team)
    if (isRoleKey(member.role_key)) wanted.add(member.role_key);

  const roles = TEAM_ROLE_KEYS.filter((role) => wanted.has(role)).map(
    (role) => ({
      role,
      member: team.find((m) => m.role_key === role) ?? null,
    }),
  );
  const others = team.filter((m) => !isRoleKey(m.role_key));
  return { roles, others };
}
