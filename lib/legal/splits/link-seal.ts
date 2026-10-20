import "server-only";

import { sealLinkToken } from "@/lib/legal/forms/link-seal";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Keeps the links just created sealed (rule 19, LEGAL_LINK_KEY), so they
 * stay visible in the split's step: each entry's pending confirmation gets
 * its token sealed by the server. Returns the entries sealed; none without
 * the key (the links are then shown once, as before).
 */
export async function sealSplitLinks(
  supabase: Client,
  links: Array<{ entryId: string; token: string }>,
): Promise<Set<string>> {
  const done = new Set<string>();
  const sealed = links.flatMap((l) => {
    const value = sealLinkToken(l.token);
    return value ? [{ ...l, value }] : [];
  });
  if (sealed.length === 0) return done;
  const { data, error } = await supabase
    .from("legal_split_confirmations")
    .select("id, entry_id")
    .in(
      "entry_id",
      sealed.map((l) => l.entryId),
    )
    .eq("status", "pending")
    .is("link_sealed", null);
  if (error) console.error("sealSplitLinks:", error.message);
  await Promise.all(
    sealed.map(async (l) => {
      const row = (data ?? []).find((r) => r.entry_id === l.entryId);
      if (!row) return;
      const { error: sealError } = await supabase.rpc(
        "seal_split_confirmation_link",
        { p_confirmation_id: row.id, p_sealed: l.value },
      );
      if (sealError) console.error("sealSplitLinks:", sealError.message);
      else done.add(l.entryId);
    }),
  );
  return done;
}
