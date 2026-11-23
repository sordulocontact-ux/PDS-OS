import "server-only";

import { randomUUID } from "node:crypto";

import type { InboxMessage } from "@/lib/email/inbox";
import { formatDate } from "@/lib/release/format";
import type { createAdminClient } from "@/lib/supabase/admin";

export type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

export type SignedCopyFile = {
  path: string;
  file_name: string;
  mime: string;
  category: "signed" | "evidence";
};

/**
 * What a reply carrying a signed contract leaves in the contract's folder
 * (cron, service role): its PDFs as « Signé », the e-mail itself (.eml) as
 * « Preuve de signature ». The files, uploaded, for the function that
 * records them; null when an upload failed (nothing is left behind).
 * Shared by the authorisation contracts (lib/legal/clearance/
 * signed-by-email.ts) and every contract (lib/contracts/signed-by-email.ts).
 */
export async function uploadSignedCopy(
  supabase: Admin,
  contract: { id: string; organization_id: string },
  from: string,
  receivedAt: Date | null,
  message: InboxMessage,
): Promise<SignedCopyFile[] | null> {
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
      console.error("uploadSignedCopy:", error.message);
      await removeSignedCopy(supabase, uploaded);
      return null;
    }
    uploaded.push(f.path);
  }
  return files.map(({ path, file_name, mime, category }) => ({
    path,
    file_name,
    mime,
    category,
  }));
}

/** The files of a copy that was not kept. */
export async function removeSignedCopy(supabase: Admin, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from("contract-files").remove(paths);
  if (error) console.error("removeSignedCopy:", error.message);
}
