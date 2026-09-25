import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env-public";
import type { Database } from "@/lib/supabase/database.types";

/** Supabase client for Client Components. Anon key only: RLS applies. */
export function createClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } =
    getPublicEnv();

  return createBrowserClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
