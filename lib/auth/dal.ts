// Imported from Ibé's PO foundation (po/lib/auth/dal.ts).
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, fetchAccess, type Access } from "@/lib/auth/access";
import {
  destinationFor,
  routes,
  type AccessState,
  type Permission,
} from "@/lib/auth/redirects";

// Couche d'accès aux données : la seule porte par laquelle une page apprend
// qui est connecté et ce qu'il a le droit de voir. À appeler dans chaque
// page, jamais dans un layout (un layout ne se ré-exécute pas à la
// navigation).

export const getAccess = cache(async (): Promise<Access> => {
  const supabase = await createClient();
  return fetchAccess(supabase);
});

// La page n'est visible que dans ces états ; sinon, on envoie la personne là
// où son état s'affiche.
export async function requireState(
  allowed: readonly AccessState[],
): Promise<Access> {
  const access = await getAccess();
  if (!allowed.includes(access.state)) {
    redirect(destinationFor(access.state));
  }
  return access;
}

export async function requireAnonymous(): Promise<void> {
  await requireState(["anonymous"]);
}

export async function requireSignedIn(): Promise<Access> {
  const access = await getAccess();
  if (access.state === "anonymous") {
    redirect(routes.login);
  }
  return access;
}

export async function requireApproved(): Promise<Access> {
  return requireState(["approved"]);
}

export async function requireAdmin(): Promise<Access> {
  const access = await requireApproved();
  if (!can(access, "administer")) {
    redirect(routes.app);
  }
  return access;
}

// Page reserved to a permission: anyone else goes back to the home page.
export async function requirePermission(
  permission: Permission,
): Promise<Access> {
  const access = await requireApproved();
  if (!can(access, permission)) {
    redirect(routes.app);
  }
  return access;
}
