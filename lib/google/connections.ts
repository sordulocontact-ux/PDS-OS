import "server-only";

import type { Access } from "@/lib/auth/access";
import { listConnectedAccounts } from "@/lib/google/accounts";
import {
  GOOGLE_SERVICES,
  isGoogleService,
  type GoogleService,
  type GoogleServiceStatus,
} from "@/lib/google/services";
import { loadWorkAddress } from "@/lib/google/work-address";
import {
  connectAccessToken,
  connectConfigured,
} from "@/lib/integrations/google-connect";
import {
  GOOGLE_SCOPE,
  probeGoogleService,
  type ProbeResult,
} from "@/lib/integrations/google-member-api";
import {
  probeWorkspaceService,
  workspaceConfigured,
  workspaceDomain,
} from "@/lib/integrations/google-workspace";
import { createClient } from "@/lib/supabase/server";

export type GoogleAccountView = {
  email: string;
  // work: through the domain, no click; personal: connected by the member.
  kind: "work" | "personal";
  // The connected account's row (personal only), for « Déconnecter ».
  id: string | null;
  services: { service: GoogleService; status: GoogleServiceStatus }[];
};

export type GoogleConnections =
  | { kind: "error" }
  | {
      kind: "ok";
      accounts: GoogleAccountView[];
      // « Connecter un compte Google » is offered (client and key set).
      canConnect: boolean;
      // No work address: the delegated domain, to say who adds it.
      workMissing: { domain: string } | null;
    };

// Google's answer kept a few minutes, so a settings page opened again (or
// re-rendered after a switch) does not ask it each time. Only a success is
// kept: a failure is asked again next time.
const PROBE_TTL = 5 * 60_000;
const probes = new Map<string, number>();

async function probe(
  email: string,
  service: GoogleService,
  run: () => Promise<ProbeResult>,
): Promise<ProbeResult> {
  const key = `${email}|${service}`;
  const at = probes.get(key);
  if (at && Date.now() - at < PROBE_TTL) return "connected";
  const status = await run();
  if (status === "connected") probes.set(key, Date.now());
  return status;
}

/**
 * Paramètres › Connexions: the signed-in member's Google accounts (the work
 * one through the domain, then those they connected), each service with what
 * Google answers. Everything is read with their session (RLS: theirs only);
 * a service they turned off is never asked to Google.
 */
export async function loadGoogleConnections(
  access: Access,
): Promise<GoogleConnections> {
  const supabase = await createClient();
  const [work, connected, optOuts] = await Promise.all([
    loadWorkAddress(access),
    listConnectedAccounts(),
    supabase.from("google_service_opt_outs").select("account_email, service"),
  ]);
  if (work.error || !connected || optOuts.error) {
    if (optOuts.error)
      console.error("loadGoogleConnections:", optOuts.error.message);
    return { kind: "error" };
  }
  const off = new Set(
    optOuts.data
      .filter((row) => isGoogleService(row.service))
      .map((row) => `${row.account_email}|${row.service}`),
  );
  const isOff = (email: string, service: GoogleService) =>
    off.has(`${email}|${service}`);

  const accounts: GoogleAccountView[] = [];
  if (work.email) {
    const email = work.email;
    const configured = workspaceConfigured();
    accounts.push({
      email,
      kind: "work",
      id: null,
      services: await Promise.all(
        GOOGLE_SERVICES.map(async (service) => ({
          service,
          status: isOff(email, service)
            ? ("off" as const)
            : configured
              ? await probe(email, service, () =>
                  probeWorkspaceService(email, service),
                )
              : ("not_set" as const),
        })),
      ),
    });
  }
  const connectReady = connectConfigured();
  for (const account of connected) {
    accounts.push({
      email: account.email,
      kind: "personal",
      id: account.id,
      services: await Promise.all(
        GOOGLE_SERVICES.map(async (service) => ({
          service,
          status: isOff(account.email, service)
            ? ("off" as const)
            : !connectReady
              ? ("not_set" as const)
              : // Unticked on Google's consent page: not granted.
                !account.scopes.includes(GOOGLE_SCOPE[service])
                ? ("refused" as const)
                : await probe(account.email, service, () =>
                    probeGoogleService(service, () =>
                      connectAccessToken(account.id, account.sealed),
                    ),
                  ),
        })),
      ),
    });
  }
  const domain = workspaceDomain();
  return {
    kind: "ok",
    accounts,
    canConnect: connectReady,
    workMissing: !work.email && domain ? { domain } : null,
  };
}
