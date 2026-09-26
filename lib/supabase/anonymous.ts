import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env-public";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Anon-key client with no session storage: signs someone up on their behalf
 * (account created by the director) without touching the caller's session
 * cookies. Same rights as the public sign-up form, nothing more.
 */
export function createAnonymousClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } =
    getPublicEnv();
  return createClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
