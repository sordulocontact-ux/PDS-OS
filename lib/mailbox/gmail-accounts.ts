import "server-only";

import type { Access } from "@/lib/auth/access";
import { listConnectedAccounts } from "@/lib/google/accounts";
import { loadWorkAddress } from "@/lib/google/work-address";
import {
  connectAccessToken,
  connectConfigured,
} from "@/lib/integrations/google-connect";
import { GOOGLE_SCOPE } from "@/lib/integrations/google-member-api";
import {
  workspaceAccessToken,
  workspaceConfigured,
} from "@/lib/integrations/google-workspace";
import { createClient } from "@/lib/supabase/server";

// The work account's key; a connected account's key is its row's id.
export const WORK_ACCOUNT = "work";

export type GmailAccount = {
  key: string;
  email: string;
  token: () => Promise<string>;
};

/**
 * The signed-in member's own Gmail accounts for « Mon Gmail » (page
 * « Mails »): their work address through the domain, then the accounts they
 * connected with Gmail granted, those they turned Gmail off for left out
 * (Paramètres › Connexions). Read with their session: never anyone else's.
 */
export async function gmailAccounts(
  access: Access,
): Promise<{ accounts: GmailAccount[]; error: boolean }> {
  const supabase = await createClient();
  const [work, connected, optOuts] = await Promise.all([
    loadWorkAddress(access),
    listConnectedAccounts(),
    supabase
      .from("google_service_opt_outs")
      .select("account_email")
      .eq("service", "gmail"),
  ]);
  if (work.error || !connected || optOuts.error) {
    if (optOuts.error) console.error("gmailAccounts:", optOuts.error.message);
    return { accounts: [], error: true };
  }
  const off = new Set(optOuts.data.map((row) => row.account_email));
  const accounts: GmailAccount[] = [];
  const workEmail = work.email;
  if (workEmail && workspaceConfigured() && !off.has(workEmail))
    accounts.push({
      key: WORK_ACCOUNT,
      email: workEmail,
      token: () => workspaceAccessToken(workEmail, "gmail"),
    });
  if (connectConfigured())
    for (const account of connected)
      if (
        !off.has(account.email) &&
        account.scopes.includes(GOOGLE_SCOPE.gmail)
      )
        accounts.push({
          key: account.id,
          email: account.email,
          token: () => connectAccessToken(account.id, account.sealed),
        });
  return { accounts, error: false };
}

/** One of the member's own accounts, by its key; null for any other. */
export async function gmailAccountOf(
  access: Access,
  key: string,
): Promise<GmailAccount | null> {
  const { accounts } = await gmailAccounts(access);
  return accounts.find((a) => a.key === key) ?? null;
}
