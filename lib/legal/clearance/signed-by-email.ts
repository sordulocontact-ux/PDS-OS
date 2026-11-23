import "server-only";

import {
  removeSignedCopy,
  uploadSignedCopy,
  type Admin,
} from "@/lib/contracts/signed-copy-upload";
import type { InboxMessage } from "@/lib/email/inbox";

/**
 * A reply to the authorisation contract that carries PDFs (Sacha,
 * 09/11/2026): when the borrowing has exactly one contract sent for
 * signature and still without a signed copy, the PDFs go to its files as
 * « Signé » and the e-mail itself (.eml) as « Preuve de signature »
 * (`receive_clearance_signed_copy`). A person still opens the copy and
 * marks the borrowing secured. Called by the cron that files the replies
 * (service role); never fails the filing. True when the copy was kept.
 */
export async function fileSignedCopy(
  supabase: Admin,
  clearanceId: string,
  from: string,
  receivedAt: Date | null,
  message: InboxMessage,
): Promise<boolean> {
  if (message.pdfs.length === 0) return false;
  const { data: links } = await supabase
    .from("legal_clearance_contracts")
    .select("contract_id")
    .eq("clearance_id", clearanceId);
  const ids = [...new Set((links ?? []).map((l) => l.contract_id))];
  if (ids.length === 0) return false;
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, organization_id, status")
    .in("id", ids)
    .eq("status", "sent");
  // Which contract a PDF signs is never guessed: one sent, or nothing.
  if (!contracts || contracts.length !== 1) return false;
  const contract = contracts[0];
  const { count } = await supabase
    .from("contract_files")
    .select("id", { count: "exact", head: true })
    .eq("contract_id", contract.id)
    .eq("category", "signed");
  if ((count ?? 0) > 0) return false;

  const files = await uploadSignedCopy(
    supabase,
    contract,
    from,
    receivedAt,
    message,
  );
  if (!files) return false;
  const { data: kept, error } = await supabase.rpc(
    "receive_clearance_signed_copy",
    {
      p_clearance_id: clearanceId,
      p_contract_id: contract.id,
      p_from: from,
      p_files: files,
    },
  );
  if (error) console.error("fileSignedCopy:", error.message);
  if (error || kept !== true) {
    await removeSignedCopy(
      supabase,
      files.map((f) => f.path),
    );
    return false;
  }
  return true;
}
