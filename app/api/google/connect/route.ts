import { NextResponse } from "next/server";

import { requireApproved } from "@/lib/auth/dal";
import { siteUrl } from "@/lib/auth/site-url";
import {
  CONNECT_COOKIE,
  CONNECT_COOKIE_PATH,
  settingsAfterConnect,
  startConnectFlow,
} from "@/lib/google/connect-flow";
import {
  connectAuthorizeUrl,
  connectConfigured,
} from "@/lib/integrations/google-connect";

/** « Connecter un compte Google »: off to Google's consent page. */
export async function GET() {
  const access = await requireApproved();
  if (!access.personId || !connectConfigured())
    return NextResponse.redirect(
      `${siteUrl()}${settingsAfterConnect("failed")}`,
    );
  const flow = startConnectFlow(access.personId);
  if (!flow.cookie)
    return NextResponse.redirect(
      `${siteUrl()}${settingsAfterConnect("failed")}`,
    );
  const response = NextResponse.redirect(
    connectAuthorizeUrl(flow.state, flow.challenge),
  );
  response.cookies.set(CONNECT_COOKIE, flow.cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: CONNECT_COOKIE_PATH,
    maxAge: flow.maxAge,
  });
  return response;
}
