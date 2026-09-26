import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";
import { getPublicEnv } from "@/lib/env-public";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Service-role client: bypasses RLS. Only for server jobs that no user
 * triggers (CLAUDE.md rule 3). Imported by app/api/cron/** only.
 * Returns null when the key is not configured.
 */
export function createAdminClient() {
  const key = getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient<Database>(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
