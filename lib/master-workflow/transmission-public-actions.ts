"use server";

import { revalidatePath } from "next/cache";

import { TOKEN } from "@/lib/master-workflow/transmission-public";
import { createClient } from "@/lib/supabase/server";

/**
 * "J'ai bien reçu le dossier", from the engineer's page, without an account:
 * the database checks the token and notifies the sender
 * (acknowledge_master_transmission). Returns the link's state after it.
 */
export async function acknowledgeMasterPackage(token: string): Promise<string> {
  if (!TOKEN.test(token)) return "unknown";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "acknowledge_master_transmission",
    {
      p_token: token,
    },
  );
  if (error) {
    console.error("acknowledgeMasterPackage:", error.message);
    return "failed";
  }
  revalidatePath(`/m/${token}`);
  return data ?? "unknown";
}
