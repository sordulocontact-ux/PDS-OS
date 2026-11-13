import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { requireApproved } from "@/lib/auth/dal";
import { siteUrl } from "@/lib/auth/site-url";
import { saveConnectedAccount } from "@/lib/google/accounts";
import {
  CONNECT_COOKIE,
  CONNECT_COOKIE_PATH,
  finishConnectFlow,
  settingsAfterConnect,
} from "@/lib/google/connect-flow";
import type { ConnectOutcome } from "@/lib/google/services";
import { sealGoogleToken } from "@/lib/google/token-seal";
import { loadWorkAddress } from "@/lib/google/work-address";
import {
  exchangeConnectCode,
  revokeConnectToken,
} from "@/lib/integrations/google-connect";
import { workspaceConfigured } from "@/lib/integrations/google-workspace";

/**
 * Google's return from « Connecter un compte Google »: checked against the
 * round trip's cookie (same member, same state, ten minutes), the code turned
 * into a refresh token, sealed and kept with the member's session (RLS).
 */
export async function GET(request: NextRequest) {
  const access = await requireApproved();
  const jar = await cookies();
  const cookie = jar.get(CONNECT_COOKIE)?.value;
  const params = request.nextUrl.searchParams;
  const back = (outcome: ConnectOutcome) => {
    const response = NextResponse.redirect(
      `${siteUrl()}${settingsAfterConnect(outcome)}`,
    );
    response.cookies.set(CONNECT_COOKIE, "", {
      path: CONNECT_COOKIE_PATH,
      maxAge: 0,
    });
    return response;
  };

  if (params.get("error")) return back("cancelled");
  const verifier = access.personId
    ? finishConnectFlow(cookie, params.get("state"), access.personId)
    : null;
  const code = params.get("code");
  if (!verifier || !code) return back("failed");

  let account: Awaited<ReturnType<typeof exchangeConnectCode>>;
  try {
    account = await exchangeConnectCode(code, verifier);
  } catch {
    return back("failed");
  }

  // The work account is already read through the domain: not kept twice.
  const work = await loadWorkAddress(access);
  if (workspaceConfigured() && work.email === account.email) {
    await revokeConnectToken(account.refreshToken);
    return back("already");
  }

  const sealed = sealGoogleToken(account.refreshToken);
  const saved =
    sealed !== null &&
    (await saveConnectedAccount({
      email: account.email,
      sealed,
      scopes: account.scopes,
    }));
  if (!saved) {
    await revokeConnectToken(account.refreshToken);
    return back("failed");
  }
  return back("connected");
}
