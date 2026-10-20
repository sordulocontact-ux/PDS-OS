import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ContractProof = {
  signed: boolean;
  evidence: boolean;
  // How it was sent for signature (20261020070101): on the person's
  // private link, or handed otherwise (how, and the day).
  sent: { via: "link" | "other"; how: string | null; on: string } | null;
  // The signed copy the person deposited by their link, timestamped: the
  // proof of their signature (« Voir le PDF »: a link valid one hour).
  deposit: { fileName: string; at: string; url: string | null } | null;
};

const empty = (): ContractProof => ({
  signed: false,
  evidence: false,
  sent: null,
  deposit: null,
});

/** Whether each contract holds its signed copy and its proof of signature,
 * how it was sent, and what came back by the person's link — read with the
 * viewer's session (RLS: the contract's readers). */
export async function contractProofOf(
  contractIds: string[],
): Promise<Map<string, ContractProof>> {
  const proof = new Map<string, ContractProof>(
    contractIds.map((id) => [id, empty()]),
  );
  if (contractIds.length === 0) return proof;
  const supabase = await createClient();
  const [files, contracts] = await Promise.all([
    supabase
      .from("contract_files")
      .select(
        "contract_id, category, via_contact_id, file_name, path, created_at",
      )
      .in("contract_id", contractIds)
      .in("category", ["signed", "evidence"])
      .order("created_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("id, sent_via, sent_how, sent_on")
      .in("id", contractIds),
  ]);
  if (files.error) console.error("contractProofOf:", files.error.message);
  if (contracts.error)
    console.error("contractProofOf:", contracts.error.message);
  const deposits: Array<{ id: string; path: string }> = [];
  for (const row of files.data ?? []) {
    const known = proof.get(row.contract_id);
    if (!known) continue;
    if (row.category === "signed") known.signed = true;
    if (row.category === "evidence") known.evidence = true;
    if (row.category === "signed" && row.via_contact_id && !known.deposit) {
      known.deposit = {
        fileName: row.file_name,
        at: row.created_at,
        url: null,
      };
      deposits.push({ id: row.contract_id, path: row.path });
    }
  }
  for (const c of contracts.data ?? []) {
    const known = proof.get(c.id);
    if (known && c.sent_on && (c.sent_via === "link" || c.sent_via === "other"))
      known.sent = { via: c.sent_via, how: c.sent_how, on: c.sent_on };
  }
  if (deposits.length > 0) {
    const { data } = await supabase.storage
      .from("contract-files")
      .createSignedUrls(
        deposits.map((d) => d.path),
        3600,
      );
    deposits.forEach((d, i) => {
      const known = proof.get(d.id);
      if (known?.deposit) known.deposit.url = data?.[i]?.signedUrl ?? null;
    });
  }
  return proof;
}
