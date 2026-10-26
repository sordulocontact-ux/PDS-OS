"use server";

import { redirect } from "next/navigation";

import { routes } from "@/lib/auth/redirects";
import { preprodAccount } from "@/lib/preprod/accounts";
import { preprodPassword } from "@/lib/preprod/config";
import { createClient } from "@/lib/supabase/server";

/**
 * « Voir comme » of the pre-production bar: a real sign-in as another test
 * account, through the anon client (RLS keeps deciding what each one sees),
 * then back to the same page. Only a signed-in visitor of the pre-production
 * can switch; anywhere else this does nothing.
 */
export async function switchPreprodAccount(
  key: string,
  path: string,
): Promise<void> {
  const password = preprodPassword();
  const account = preprodAccount(key);
  if (!password || !account) return;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;

  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password,
  });
  if (error) {
    console.error("switchPreprodAccount:", error.code, error.message);
    redirect(routes.login);
  }
  // Same-site paths of the app only: never an open redirect.
  redirect(path.startsWith(`${routes.app}`) ? path : routes.app);
}
