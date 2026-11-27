import "server-only";

import { mergeShortcuts, type ShortcutMap } from "@/lib/shortcuts/definitions";
import { createClient } from "@/lib/supabase/server";

/** The reader's shortcuts (their own row only, RLS), defaults otherwise. */
export async function loadMyShortcuts(): Promise<ShortcutMap> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("account_shortcuts")
    .select("shortcuts")
    .maybeSingle();
  return mergeShortcuts(data?.shortcuts);
}
