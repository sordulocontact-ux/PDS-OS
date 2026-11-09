import "server-only";

import { randomUUID } from "node:crypto";

import type { InboxMessage } from "@/lib/email/inbox";
import { formatDate } from "@/lib/release/format";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

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

  const folder = `${contract.organization_id}/${contract.id}`;
  const day = formatDate((receivedAt ?? new Date()).toISOString());
  const files = [
    ...message.pdfs.map((pdf) => ({
      path: `${folder}/${randomUUID()}.pdf`,
      file_name: pdf.name,
      mime: "application/pdf",
      category: "signed" as const,
      content: pdf.content,
    })),
    {
      path: `${folder}/${randomUUID()}.eml`,
      file_name: `E-mail de ${from} du ${day}.eml`.slice(0, 255),
      mime: "message/rfc822",
      category: "evidence" as const,
      content: message.source,
    },
  ];
  const uploaded: string[] = [];
  for (const f of files) {
    const { error } = await supabase.storage
      .from("contract-files")
      .upload(f.path, f.content, { contentType: f.mime });
    if (error) {
      console.error("fileSignedCopy upload:", error.message);
      await remove(supabase, uploaded);
      return false;
    }
    uploaded.push(f.path);
  }
  const { data: kept, error } = await supabase.rpc(
    "receive_clearance_signed_copy",
    {
      p_clearance_id: clearanceId,
      p_contract_id: contract.id,
      p_from: from,
      p_files: files.map((f) => ({
        path: f.path,
        file_name: f.file_name,
        mime: f.mime,
        category: f.category,
      })),
    },
  );
  if (error) console.error("fileSignedCopy:", error.message);
  if (error || kept !== true) {
    await remove(supabase, uploaded);
    return false;
  }
  return true;
}

async function remove(supabase: Admin, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from("contract-files").remove(paths);
  if (error) console.error("fileSignedCopy remove:", error.message);
}
