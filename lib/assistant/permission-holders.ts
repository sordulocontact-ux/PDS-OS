import "server-only";

import { personName } from "@/lib/projects/types";
import {
  ORGANIZATION_ROLES,
  isOrganizationRole,
  type OrganizationRole,
  type Permission,
} from "@/lib/auth/redirects";
import { auth } from "@/lib/i18n/fr/auth";
import { createClient } from "@/lib/supabase/server";

const fr = { auth };

/**
 * Who holds a permission, read from the database's own mapping
 * (role_permissions, the only source of rights) and the approved members:
 * never a list kept in code. For explain_access and app_guide.
 */
export type PermissionHolders = {
  /** « Lina Haddad (chef de projet), … »: the members holding it. */
  members: (permission: Permission) => { name: string; position: string }[];
  /** « directeur général, chef de projet »: the positions holding it. */
  positions: (permission: Permission) => string[];
};

export const positionLabel = (role: OrganizationRole) =>
  fr.auth.members.roles[role];

export async function loadPermissionHolders(): Promise<PermissionHolders> {
  const supabase = await createClient();
  const [memberships, ...mappings] = await Promise.all([
    supabase
      .from("memberships")
      .select("role, people!memberships_person_id_fkey(first_name, last_name)")
      .eq("status", "approved"),
    ...ORGANIZATION_ROLES.map((role) =>
      supabase.rpc("role_permissions", { p_role: role }),
    ),
  ]);
  const byRole = new Map<OrganizationRole, readonly string[]>(
    ORGANIZATION_ROLES.map((role, i) => [role, mappings[i].data ?? []]),
  );
  const members = (memberships.data ?? []).flatMap((m) =>
    m.people && isOrganizationRole(m.role)
      ? [
          {
            name: personName(m.people.first_name, m.people.last_name),
            role: m.role,
          },
        ]
      : [],
  );
  const holds = (role: OrganizationRole, permission: Permission) =>
    byRole.get(role)?.includes(permission) ?? false;
  return {
    members: (permission) =>
      members
        .filter((m) => holds(m.role, permission))
        .map((m) => ({ name: m.name, position: positionLabel(m.role) })),
    positions: (permission) =>
      ORGANIZATION_ROLES.filter((role) => holds(role, permission)).map((role) =>
        positionLabel(role).toLowerCase(),
      ),
  };
}
