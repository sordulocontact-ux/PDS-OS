import "server-only";

import type { EmailAttachment } from "@/lib/email/send";
import { contracts as contractTexts } from "@/lib/i18n/fr/contracts";
import { documentFileName } from "@/lib/legal/contracts/document-name";
import { isDocumentFont } from "@/lib/legal/contracts/document-fonts";
import { contractPdf } from "@/lib/legal/contracts/document-pdf";
import { loadContractLetterhead } from "@/lib/legal/contracts/letterhead";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ContractDocumentRef = {
  // The file joined to the e-mail, as the rights holder will receive it.
  fileName: string;
  // The generated document (printed as a PDF), else a file dropped as the
  // contract's draft (« Projet » on its page).
  kind: "generated" | "file";
};

/**
 * What each authorisation contract will be sent as (Sacha, 09/11/2026: the
 * contract leaves by e-mail from the borrowing, like the request): the
 * latest version of its generated document, else its latest draft file.
 * None: the contract has no text yet — PDS OS never writes one. Read with
 * the viewer's session (RLS: can_see_contract).
 */
export async function contractDocumentRefs(
  supabase: Supabase,
  contracts: Array<{ id: string; title: string }>,
): Promise<Map<string, ContractDocumentRef>> {
  const refs = new Map<string, ContractDocumentRef>();
  if (contracts.length === 0) return refs;
  const ids = contracts.map((c) => c.id);
  const [documents, drafts] = await Promise.all([
    supabase
      .from("contract_documents")
      .select("contract_id, version")
      .in("contract_id", ids)
      .order("version", { ascending: false }),
    supabase
      .from("contract_files")
      .select("contract_id, file_name")
      .in("contract_id", ids)
      .eq("category", "draft")
      .order("created_at", { ascending: false }),
  ]);
  if (documents.error)
    console.error("contractDocumentRefs:", documents.error.message);
  if (drafts.error)
    console.error("contractDocumentRefs:", drafts.error.message);
  for (const c of contracts) {
    const version = (documents.data ?? []).find(
      (d) => d.contract_id === c.id,
    )?.version;
    if (version !== undefined) {
      refs.set(c.id, {
        kind: "generated",
        fileName: documentFileName(
          contractTexts.now.send.fileName(c.title, version),
        ),
      });
      continue;
    }
    const draft = (drafts.data ?? []).find((d) => d.contract_id === c.id);
    if (draft) refs.set(c.id, { kind: "file", fileName: draft.file_name });
  }
  return refs;
}

/** The contracts as files to join to the e-mail; null when one has no
 * document (nothing is sent then) or could not be read. */
export async function contractAttachments(
  contractIds: string[],
): Promise<EmailAttachment[] | null> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("contracts")
    .select("id, title")
    .in("id", contractIds);
  const contracts = rows ?? [];
  if (contracts.length !== contractIds.length) return null;
  const attachments: EmailAttachment[] = [];
  for (const c of contracts) {
    const generated = await supabase
      .from("contract_documents")
      .select("version, body, template_id")
      .eq("contract_id", c.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (generated.data) {
      // Printed in its template's typeface (Sacha 25/11/2026).
      const { data: template } = generated.data.template_id
        ? await supabase
            .from("contract_templates")
            .select("font")
            .eq("id", generated.data.template_id)
            .maybeSingle()
        : { data: null };
      try {
        attachments.push({
          filename: documentFileName(
            contractTexts.now.send.fileName(c.title, generated.data.version),
          ),
          content: await contractPdf({
            title: c.title,
            body: generated.data.body,
            font: isDocumentFont(template?.font) ? template.font : null,
            letterhead: await loadContractLetterhead(supabase, c.id),
          }),
          contentType: "application/pdf",
        });
        continue;
      } catch (error) {
        console.error("contractAttachments pdf:", error);
        return null;
      }
    }
    const { data: draft } = await supabase
      .from("contract_files")
      .select("path, file_name, mime")
      .eq("contract_id", c.id)
      .eq("category", "draft")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!draft) return null;
    const { data: blob, error } = await supabase.storage
      .from("contract-files")
      .download(draft.path);
    if (error || !blob) {
      console.error("contractAttachments file:", error?.message);
      return null;
    }
    attachments.push({
      filename: draft.file_name,
      content: new Uint8Array(await blob.arrayBuffer()),
      contentType: draft.mime,
    });
  }
  return attachments;
}
