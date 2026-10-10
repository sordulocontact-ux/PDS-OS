"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { rankedNetwork, type RankedPerson } from "@/lib/network/ranked-people";
import { NETWORK_ROLES } from "@/lib/network/types";
import { createClient } from "@/lib/supabase/server";

/** The Réseau to pick someone for a role from: those holding one of
 * `roles` first, then everyone else. Read with the user's session. */
export async function listNetworkForRole(
  roles: string[],
): Promise<RankedPerson[]> {
  await requireApproved();
  const parsed = z.array(z.enum(NETWORK_ROLES)).min(1).safeParse(roles);
  if (!parsed.success) return [];
  return rankedNetwork(await createClient(), parsed.data);
}
