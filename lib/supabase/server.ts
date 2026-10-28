import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/lib/env-public";
import { trackingFetch } from "@/lib/projects/live-deps";
import { cachingFetch } from "@/lib/projects/request-cache";
import { batchingFetch } from "@/lib/supabase/batch";
import type { Database } from "@/lib/supabase/database.types";
import { tracingFetch } from "@/lib/supabase/query-trace";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Uses the anon key and the user's session cookies: RLS applies.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } =
    getPublicEnv();

  return createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      // Batched only inside withQueryBatching (lib/supabase/batch.ts);
      // measured with PERF_TRACE=1 (lib/supabase/query-trace.ts); what a
      // kept view reads, recorded for its cache (lib/projects/live-deps.ts)
      // and served from the answers kept (lib/projects/request-cache.ts).
      global: {
        fetch: trackingFetch(cachingFetch(tracingFetch(batchingFetch))),
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Session refresh will be handled by the proxy (step 3).
          }
        },
      },
    },
  );
}
