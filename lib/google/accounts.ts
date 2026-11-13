import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * The Google accounts a member connected themselves, with their session
 * (RLS: theirs only). A second consent for the same address replaces its
 * token and scopes.
 */
export async function saveConnectedAccount(input: {
  email: string;
  sealed: string;
  scopes: string[];
}): Promise<boolean> {
  const supabase = await createClient();
  const existing = await supabase
    .from("google_accounts")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();
  if (existing.error) {
    console.error("saveConnectedAccount:", existing.error.message);
    return false;
  }
  const { error } = existing.data
    ? await supabase
        .from("google_accounts")
        .update({
          refresh_token_sealed: input.sealed,
          scopes: input.scopes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.data.id)
    : await supabase.from("google_accounts").insert({
        email: input.email,
        refresh_token_sealed: input.sealed,
        scopes: input.scopes,
      });
  if (error) console.error("saveConnectedAccount:", error.message);
  return !error;
}

export type ConnectedAccount = {
  id: string;
  email: string;
  sealed: string;
  scopes: string[];
};

/** The member's connected accounts, oldest first. */
export async function listConnectedAccounts(): Promise<
  ConnectedAccount[] | null
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("google_accounts")
    .select("id, email, refresh_token_sealed, scopes")
    .order("created_at");
  if (error) {
    console.error("listConnectedAccounts:", error.message);
    return null;
  }
  return data.map((row) => ({
    id: row.id,
    email: row.email,
    sealed: row.refresh_token_sealed,
    scopes: row.scopes,
  }));
}
