import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except static files, images and the labo API (no session
  // needed; the proxy would cap its audio uploads at 10 MB).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/labo/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
