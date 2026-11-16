import {
  FINANCE_FILE_TYPES,
  FINANCE_FILES_BUCKET,
} from "@/lib/finance/file-rules";
import { clientInvoices } from "@/lib/i18n/fr/client-invoices";
import { createClient } from "@/lib/supabase/client";

const fr = { clientInvoices };

const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Browser-side: puts the PDF of an invoice or a credit note in the private
 * bucket finance-files, under the organization (storage RLS:
 * manage_finance, 20261113200102_client_invoices.sql). The server action
 * that saves the row then names it. Same flow as a project's cover
 * (lib/projects/upload-cover.ts).
 */
export async function uploadFinanceFile(
  organizationId: string,
  file: File,
): Promise<
  { ok: true; path: string; name: string } | { ok: false; error: string }
> {
  const t = fr.clientInvoices.file;
  const ext = FINANCE_FILE_TYPES[file.type];
  if (!ext) return { ok: false, error: t.type };
  if (file.size > MAX_BYTES) return { ok: false, error: t.size };
  const path = `${organizationId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient()
    .storage.from(FINANCE_FILES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("[finance] file upload failed:", error.message);
    return { ok: false, error: t.failed };
  }
  return { ok: true, path, name: file.name.slice(0, 200) };
}
