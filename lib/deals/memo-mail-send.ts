import "server-only";

import { memoHtml } from "@/lib/deals/memo-pdf";
import type { DealMemo } from "@/lib/deals/memos";
import type { EmailAttachment } from "@/lib/email/send";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { htmlToPdf } from "@/lib/pdf/render";
import { createClient } from "@/lib/supabase/server";

/**
 * The files joined to the validated memo sent back: the PDFs the label or
 * the brand sent (read with the member's session, `deal-files`), else the
 * memo made in PDS OS printed as on « Exporter en PDF ». Null when they
 * cannot be read: nothing leaves without the memo.
 */
export async function memoAttachments(
  memo: DealMemo,
  dealName: string,
): Promise<EmailAttachment[] | null> {
  if (memo.source === "pds") {
    try {
      const pdf = await htmlToPdf(memoHtml(memo, dealName));
      return [
        {
          filename: dealMemos.pdf.file(dealName, memo.number),
          content: pdf,
          contentType: "application/pdf",
        },
      ];
    } catch (error) {
      console.error("memoAttachments pdf:", error);
      return null;
    }
  }
  const supabase = await createClient();
  const { data: files, error } = await supabase
    .from("deal_memo_files")
    .select("path, file_name")
    .eq("memo_id", memo.id)
    .order("created_at");
  if (error || !files?.length) {
    if (error) console.error("memoAttachments files:", error.message);
    return null;
  }
  const attachments: EmailAttachment[] = [];
  for (const f of files) {
    const { data, error: read } = await supabase.storage
      .from("deal-files")
      .download(f.path);
    if (read || !data) {
      console.error("memoAttachments download:", read?.message ?? "empty");
      return null;
    }
    attachments.push({
      filename: f.file_name,
      content: new Uint8Array(await data.arrayBuffer()),
      contentType: "application/pdf",
    });
  }
  return attachments;
}
