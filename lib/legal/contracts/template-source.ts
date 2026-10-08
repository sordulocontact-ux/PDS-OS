"use server";

import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import {
  sourceExtensionOf,
  TEMPLATE_SOURCE_BUCKET,
} from "@/lib/legal/contracts/source-rules";
import { sourceText } from "@/lib/legal/contracts/source-text";
import { createClient } from "@/lib/supabase/server";

// The source file of a template (ticket Juridique 03, « ContractTemplate :
// … fichier source »). The browser puts it in the private bucket
// (upload-source.ts); its text is read here, with the viewer's session, and
// goes back to the form, where the person reads it before saving.

const MAX_TEXT = 200_000;

export async function readTemplateSource(
  path: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const t = fr.legalContracts.templates.source;
  const access = await requireApproved();
  const valid = z.string().min(1).max(500).safeParse(path);
  if (
    !valid.success ||
    !can(access, "manage_legal") ||
    !access.organizationId ||
    !valid.data.startsWith(`${access.organizationId}/`)
  )
    return { ok: false, error: fr.auth.errors.forbidden };
  const ext = sourceExtensionOf(valid.data);
  if (!ext) return { ok: false, error: t.unsupported };

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(TEMPLATE_SOURCE_BUCKET)
    .download(valid.data);
  if (error || !data) {
    console.error("readTemplateSource:", error?.message);
    return { ok: false, error: t.failed };
  }
  let text: string | null;
  try {
    text = await sourceText(Buffer.from(await data.arrayBuffer()), ext);
  } catch (cause) {
    console.error("readTemplateSource:", cause);
    return { ok: false, error: t.unreadable };
  }
  if (!text) return { ok: false, error: t.unreadable };
  if (text.length > MAX_TEXT) return { ok: false, error: t.tooLong };
  return { ok: true, text };
}

/** A short-lived link to a template's source file. */
export async function templateSourceUrl(
  templateId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const id = catalogIdSchema.safeParse(templateId);
  await requireApproved();
  if (!id.success) return { ok: false, error: fr.auth.errors.forbidden };
  const supabase = await createClient();
  const { data: template } = await supabase
    .from("contract_templates")
    .select("source_path, source_name")
    .eq("id", id.data)
    .maybeSingle();
  if (!template?.source_path || !template.source_name)
    return { ok: false, error: fr.auth.errors.forbidden };
  const { data, error } = await supabase.storage
    .from(TEMPLATE_SOURCE_BUCKET)
    .createSignedUrl(template.source_path, 5 * 60, {
      download: template.source_name,
    });
  if (error || !data) {
    console.error("templateSourceUrl:", error?.message);
    return { ok: false, error: fr.legalContracts.templates.source.failed };
  }
  return { ok: true, url: data.signedUrl };
}
