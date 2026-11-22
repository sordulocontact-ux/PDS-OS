import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Letterhead } from "@/lib/legal/contracts/document-pdf";
import type { Database } from "@/lib/supabase/database.types";

const shape = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
});

/** The head of a contract (contract_letterhead): for a member who sees it,
 * or, with `token`, the person who signs it by their private link. Null
 * when the structure has not given its coordinates. */
export async function loadContractLetterhead(
  supabase: SupabaseClient<Database>,
  contractId: string,
  token?: string,
): Promise<Letterhead | null> {
  const { data, error } = await supabase.rpc("contract_letterhead", {
    p_contract_id: contractId,
    ...(token ? { p_contact_token: token } : {}),
  });
  if (error) console.error("loadContractLetterhead:", error.message);
  const parsed = shape.safeParse(data);
  return parsed.success ? parsed.data : null;
}
