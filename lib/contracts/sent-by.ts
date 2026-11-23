import "server-only";

import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

/** Who sent the contract for signature, from its last « Envoyé en
 * signature » (contract_events, written by SQL only). Read with the viewer's
 * session (RLS: can_see_contract); empty when nobody did. */
export async function loadContractSentBy(contractId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contract_events")
    .select("actor_person_id")
    .eq("contract_id", contractId)
    .eq("kind", "signature.requested")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error("loadContractSentBy:", error.message);
  if (!data?.actor_person_id) return "";
  const { data: person } = await supabase
    .from("people")
    .select("first_name, last_name")
    .eq("id", data.actor_person_id)
    .maybeSingle();
  return person ? personName(person.first_name, person.last_name) : "";
}
