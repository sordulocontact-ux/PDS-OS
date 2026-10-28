import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/lib/env-public";
import { trackingFetch } from "@/lib/projects/live-deps";
import { cachingFetch } from "@/lib/projects/request-cache";
import { batchingFetch } from "@/lib/supabase/batch";
import type { Database } from "@/lib/supabase/database.types";
import { tracingFetch } from "@/lib/supabase/query-trace";

type CookieList = { name: string; value: string }[];

// The session cookies read during the request, for a view computed again
// once the response is sent (lib/projects/version-cache.ts): Next refuses
// cookies() to a Server Component then.
const kept = new AsyncLocalStorage<CookieList>();

/** The request's cookies as they are now, to run something after it. */
export async function requestCookies(): Promise<CookieList> {
  return (await cookies()).getAll();
}

/** Runs `run` with the clients reading these cookies (never writing). */
export function withCookies<T>(list: CookieList, run: () => T): T {
  return kept.run(list, run);
}

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Uses the anon key and the user's session cookies: RLS applies.
 */
export async function createClient() {
  const snapshot = kept.getStore();
  const cookieStore = snapshot ? null : await cookies();
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
          return snapshot ?? cookieStore!.getAll();
        },
        setAll(cookiesToSet) {
          if (!cookieStore) return;
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
