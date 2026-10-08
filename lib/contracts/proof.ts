import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ContractProof = { signed: boolean; evidence: boolean };

/** Whether each contract holds its signed copy and its proof of signature,
 * read with the viewer's session (RLS: the contract's readers). */
export async function contractProofOf(
  contractIds: string[],
): Promise<Map<string, ContractProof>> {
  const proof = new Map<string, ContractProof>(
    contractIds.map((id) => [id, { signed: false, evidence: false }]),
  );
  if (contractIds.length === 0) return proof;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contract_files")
    .select("contract_id, category")
    .in("contract_id", contractIds)
    .in("category", ["signed", "evidence"]);
  if (error) console.error("contractProofOf:", error.message);
  for (const row of data ?? []) {
    const known = proof.get(row.contract_id);
    if (!known) continue;
    if (row.category === "signed") known.signed = true;
    if (row.category === "evidence") known.evidence = true;
  }
  return proof;
}
