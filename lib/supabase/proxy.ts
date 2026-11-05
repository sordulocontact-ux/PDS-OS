import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { routes } from "@/lib/auth/redirects";
import { parsePublicEnv } from "@/lib/env-public";
import type { Database } from "@/lib/supabase/database.types";

// Paths that never need a session: public smartlinks, fiches de
// renseignements, the Master's packages, the Production providers' spaces (/p/) and the creators' express agreements
// (/i/ : their token is checked by the database), a person's page by project (/c/), the shared
// strategy documents (/d/) and the cron job
// (authenticated by its own secret). Skipping them saves an auth round trip.
const SESSIONLESS_PREFIXES = [
  "/l/",
  "/f/",
  "/m/",
  "/p/",
  "/fs/",
  "/s/",
  "/d/",
  "/i/",
  "/c/",
  "/api/cron/",
];

function isProtected(pathname: string): boolean {
  return pathname === routes.app || pathname.startsWith(`${routes.app}/`);
}

// Refreshes the session cookie on every request and sends anyone without a
// session away from /app. Nothing else: the access state is checked next to
// the data, in each page (lib/auth/dal.ts).
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (SESSIONLESS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next({ request });
  }

  // The path served, for the project's layout to answer a real 404 for a
  // record it does not have (lib/projects/record-guard.ts). Always set here,
  // so a header sent by the browser is never the one read.
  request.headers.set("x-pds-path", pathname);

  const env = parsePublicEnv();
  if (!env.success) {
    // Invalid configuration: let the home page display the diagnostic.
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.data.NEXT_PUBLIC_SUPABASE_URL,
    env.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getClaims() (not getSession()) refreshes an expired session and verifies
  // the token's signature locally, without an auth server round trip on every
  // request and every prefetch (lib/auth/access.ts).
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub && isProtected(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = routes.login;
    // The page asked for, kept to come back to it once signed in (a link
    // shared to the Repérage: /app/labo?url=…). Pages of the app only.
    const asked = `${pathname}${request.nextUrl.search}`;
    loginUrl.search = "";
    if (pathname.startsWith(`${routes.app}/`))
      loginUrl.searchParams.set("next", asked);
    const redirection = NextResponse.redirect(loginUrl);
    // Carry over cookies set during getClaims(): when a token became invalid,
    // Supabase asks to delete them; without this the browser would keep
    // sending dead cookies forever.
    for (const cookie of response.cookies.getAll()) {
      redirection.cookies.set(cookie);
    }
    return redirection;
  }

  return response;
}
