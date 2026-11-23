"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const input = z.object({
  contractId: z.uuid(),
  category: z.enum(["draft", "signed", "evidence", "pds_signed"]),
});

/**
 * The file a contract holds in a category, its latest version: the one a
 * person replaces when they dropped the wrong one (Sacha 23/11/2026: « je
 * voudrais pouvoir changer si je me suis trompé »). Read with their
 * session (RLS: the contract's readers); null when there is none.
 */
export async function latestContractFileId(
  values: z.input<typeof input>,
): Promise<string | null> {
  const v = input.safeParse(values);
  if (!v.success) return null;
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contract_files")
    .select("id")
    .eq("contract_id", v.data.contractId)
    .eq("category", v.data.category)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error("latestContractFileId:", error.message);
  return data?.id ?? null;
}
