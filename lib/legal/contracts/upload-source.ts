import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import {
  MAX_SOURCE_BYTES,
  sourceExtensionOf,
  TEMPLATE_SOURCE_BUCKET,
} from "@/lib/legal/contracts/source-rules";
import { readTemplateSource } from "@/lib/legal/contracts/template-source";
import { createClient } from "@/lib/supabase/client";

const fr = { legalContracts };

export type TemplateSource = { path: string; name: string };

/**
 * Browser-side: puts a template's source file in the private bucket (storage
 * RLS: manage_legal of the organization), then has its text read on the
 * server. The file is linked to the template only when it is saved.
 */
export async function uploadTemplateSource(
  organizationId: string,
  file: File,
): Promise<
  | { ok: true; source: TemplateSource; text: string }
  | { ok: false; error: string }
> {
  const t = fr.legalContracts.templates.source;
  const ext = sourceExtensionOf(file.name);
  if (!ext) return { ok: false, error: t.unsupported };
  if (file.size === 0) return { ok: false, error: t.unreadable };
  if (file.size > MAX_SOURCE_BYTES) return { ok: false, error: t.tooLarge };

  const path = `${organizationId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient()
    .storage.from(TEMPLATE_SOURCE_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (error) {
    console.error("[contracts] template source upload failed:", error.message);
    return { ok: false, error: t.failed };
  }
  const read = await readTemplateSource(path);
  if (!read.ok) return read;
  return { ok: true, source: { path, name: file.name }, text: read.text };
}
