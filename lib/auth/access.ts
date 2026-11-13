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

// Pages kept off in production while the team tries them in pre-prod
// (Sacha, 13/11/2026: Finance hidden on main). Without its permission the
// item leaves the sidebar, the page refuses and PO says it is not open to
// the reader. Vercel sets VERCEL_ENV to "production" on main's deployments
// only (pre-prod is "preview", local is unset). Hiding, not security: RLS
// still decides what the database gives.
const OFF_IN_PRODUCTION: readonly Permission[] = ["read_finance"];

function shownHere(permission: Permission): boolean {
  return (
    process.env.VERCEL_ENV !== "production" ||
    !OFF_IN_PRODUCTION.includes(permission)
  );
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

// Lit l'état d'accès du compte connecté via la fonction get_my_access() de la
// base. Toute erreur ou réponse inattendue vaut « pas d'accès » : on ne donne
// jamais l'accès par défaut.
export async function fetchAccess(
  supabase: SupabaseClient<Database>,
): Promise<Access> {
  // getClaims() verifies the token's signature locally (asymmetric signing
  // keys, JWKS cached by auth-js) instead of asking the auth server on every
  // page: a session revoked elsewhere stays readable until the token expires
  // (jwt_expiry, 1 h), which is harmless since RLS checks the same token and
  // get_my_access() re-reads the membership on each call.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    return anonymousAccess;
  }

  const { data: accessData, error } = await supabase.rpc("get_my_access");
  if (error) {
    console.error("get_my_access :", error.message);
  }

  const raw = (
    accessData && typeof accessData === "object" ? accessData : {}
  ) as Record<string, unknown>;
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
        ? raw.permissions.filter(isPermission).filter(shownHere)
        : [],
    personId: asString(raw.person_id),
    organizationId: asString(raw.organization_id),
    firstName: asString(raw.first_name),
    lastName: asString(raw.last_name),
    email: asString(claims.email),
    accountId: claims.sub,
  };
}

export function can(access: Access, permission: Permission): boolean {
  return access.permissions.includes(permission);
}
