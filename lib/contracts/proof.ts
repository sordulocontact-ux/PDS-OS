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
  deposit: {
    fileName: string;
    at: string;
    url: string | null;
    // Sent back by e-mail (filed by the cron, 20261123110101), not by the link.
    byEmail: boolean;
  } | null;
  // Signed for PDS in PDS OS (JUR-11): by whom, when.
  countersign: { by: string | null; at: string } | null;
  // The PDF the direction signed for PDS,
  // after the person (Ibé, 07/11/2026): the copy signed by both parties; its
  // name, when, a link (1 h).
  pdsSigned: { fileName: string; at: string; url: string | null } | null;
};

const empty = (): ContractProof => ({
  signed: false,
  evidence: false,
  sent: null,
  deposit: null,
  countersign: null,
  pdsSigned: null,
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
        "contract_id, category, via_contact_id, description, series_id, file_name, path, created_at",
      )
      .in("contract_id", contractIds)
      .in("category", ["signed", "evidence", "pds_signed"])
      .order("created_at", { ascending: false }),
    supabase
      .from("contracts")
      .select(
        "id, sent_via, sent_how, sent_on, pds_signed_at, signer:people!contracts_pds_signed_by_fkey(first_name, last_name)",
      )
      .in("id", contractIds),
  ]);
  if (files.error) console.error("contractProofOf:", files.error.message);
  if (contracts.error)
    console.error("contractProofOf:", contracts.error.message);
  const deposits: Array<{ id: string; path: string }> = [];
  const pdsFiles: Array<{ id: string; path: string }> = [];
  for (const row of files.data ?? []) {
    const known = proof.get(row.contract_id);
    if (!known) continue;
    if (row.category === "signed") known.signed = true;
    if (row.category === "evidence") known.evidence = true;
    // The latest first (ordered by created_at desc).
    if (row.category === "pds_signed" && !known.pdsSigned) {
      known.pdsSigned = {
        fileName: row.file_name,
        at: row.created_at,
        url: null,
      };
      pdsFiles.push({ id: row.contract_id, path: row.path });
    }
  }
  // What came back from the person (their link, or e-mail): the series
  // their copy started, read at its latest version — the team may have
  // replaced a wrong file since (Sacha 23/11/2026), the arrival kept.
  const arrivals = new Map<string, { at: string; byEmail: boolean }>();
  for (const row of files.data ?? [])
    if (row.category === "signed" && row.via_contact_id)
      arrivals.set(row.series_id, {
        at: row.created_at,
        byEmail: row.description === "Reçu par e-mail",
      });
  for (const row of files.data ?? []) {
    const known = proof.get(row.contract_id);
    const arrival = arrivals.get(row.series_id);
    if (!known || row.category !== "signed" || !arrival || known.deposit)
      continue;
    known.deposit = {
      fileName: row.file_name,
      at: arrival.at,
      url: null,
      byEmail: arrival.byEmail,
    };
    deposits.push({ id: row.contract_id, path: row.path });
  }
  for (const c of contracts.data ?? []) {
    const known = proof.get(c.id);
    if (known && c.sent_on && (c.sent_via === "link" || c.sent_via === "other"))
      known.sent = { via: c.sent_via, how: c.sent_how, on: c.sent_on };
    if (known && c.pds_signed_at)
      known.countersign = {
        by: c.signer
          ? [c.signer.first_name, c.signer.last_name].filter(Boolean).join(" ")
          : null,
        at: c.pds_signed_at,
      };
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
  if (pdsFiles.length > 0) {
    const { data } = await supabase.storage
      .from("contract-files")
      .createSignedUrls(
        pdsFiles.map((d) => d.path),
        3600,
      );
    pdsFiles.forEach((d, i) => {
      const known = proof.get(d.id);
      if (known?.pdsSigned) known.pdsSigned.url = data?.[i]?.signedUrl ?? null;
    });
  }
  return proof;
}
