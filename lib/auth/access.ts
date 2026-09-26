// Imported from Ibé's PO foundation (po/lib/auth/access.ts).
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import {
  isAccessState,
  isOrganizationRole,
  isPermission,
  type AccessState,
  type OrganizationRole,
  type Permission,
} from "@/lib/auth/redirects";

export type Access = {
  state: AccessState;
  role: OrganizationRole | null;
  // Computed by the database from the position (role_permissions).
  permissions: Permission[];
  personId: string | null;
  organizationId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  accountId: string | null;
};

export const anonymousAccess: Access = {
  state: "anonymous",
  role: null,
  permissions: [],
  personId: null,
  organizationId: null,
  firstName: null,
  lastName: null,
  email: null,
  accountId: null,
};

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

// Lit l'état d'accès du compte connecté via la fonction get_my_access() de la
// base. Toute erreur ou réponse inattendue vaut « pas d'accès » : on ne donne
// jamais l'accès par défaut.
export async function fetchAccess(
  supabase: SupabaseClient<Database>,
): Promise<Access> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return anonymousAccess;
  }

  const { data, error } = await supabase.rpc("get_my_access");
  if (error) {
    console.error("get_my_access :", error.message);
  }

  const raw = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;
  // Une panne de la base ou une réponse inattendue ferment l'accès, mais
  // s'annoncent comme une panne — jamais comme un compte incomplet.
  const state: AccessState = error
    ? "unavailable"
    : isAccessState(raw.state)
      ? raw.state
      : "unavailable";
  const role: OrganizationRole | null = isOrganizationRole(raw.role)
    ? raw.role
    : null;

  return {
    state,
    role: state === "approved" ? role : null,
    permissions:
      state === "approved" && Array.isArray(raw.permissions)
        ? raw.permissions.filter(isPermission)
        : [],
    personId: asString(raw.person_id),
    organizationId: asString(raw.organization_id),
    firstName: asString(raw.first_name),
    lastName: asString(raw.last_name),
    email: user.email ?? null,
    accountId: user.id,
  };
}

export function can(access: Access, permission: Permission): boolean {
  return access.permissions.includes(permission);
}
