import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { fetchAccess } from "@/lib/auth/access";
import { destinationFor, routes } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

// Landing point of email links (signup confirmation, password reset).
// Consumes the token, opens the session, then sends the person where their
// state is displayed. Linking the account to a Person happens in the
// database, when the address gets confirmed.
//
// Two link formats are accepted:
// - token_hash + type: our templates (supabase/templates), works from any
//   browser or device;
// - code: Supabase's default templates (PKCE), works only in the browser
//   that started the flow.

const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  "email",
  "signup",
  "recovery",
]);

function isAllowedType(value: string | null): value is EmailOtpType {
  return value !== null && ALLOWED_TYPES.has(value);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");

  const target = request.nextUrl.clone();
  target.search = "";

  const supabase = await createClient();
  let isRecovery = false;

  if (tokenHash && isAllowedType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) {
      console.error("verifyOtp:", error.code, error.message);
      return invalidLink(target);
    }
    isRecovery = type === "recovery";
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("exchangeCodeForSession:", error.code, error.message);
      return invalidLink(target);
    }
    // Supabase's default template sends `?code=` alone, without `type`: a
    // recovery is told by the session's own authentication method.
    isRecovery =
      type === "recovery" ||
      (await openedByRecovery(supabase, data.session.access_token));
  } else {
    return invalidLink(target);
  }

  if (isRecovery) {
    target.pathname = routes.resetPassword;
    return NextResponse.redirect(target);
  }

  const access = await fetchAccess(supabase);
  target.pathname = destinationFor(access.state);
  return NextResponse.redirect(target);
}

async function openedByRecovery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accessToken: string,
): Promise<boolean> {
  const { data } = await supabase.auth.getClaims(accessToken);
  return (data?.claims.amr ?? []).some(
    (entry) =>
      (typeof entry === "string" ? entry : entry.method) === "recovery",
  );
}

function invalidLink(target: URL) {
  target.pathname = routes.login;
  target.searchParams.set("error", "link_invalid");
  return NextResponse.redirect(target);
}
