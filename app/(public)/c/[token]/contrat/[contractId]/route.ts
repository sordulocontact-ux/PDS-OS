import { z } from "zod";

import { documentFileName } from "@/lib/legal/contracts/document-name";
import { contractPdf } from "@/lib/legal/contracts/document-pdf";
import { loadContractLetterhead } from "@/lib/legal/contracts/letterhead";
import {
  notFoundResponse,
  pdfResponse,
} from "@/lib/legal/signed-returns/document-response";
import { createClient } from "@/lib/supabase/server";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

const document = z.object({
  title: z.string(),
  version: z.number(),
  body: z.string(),
});

const pdsFile = z.object({ path: z.string(), file_name: z.string() });

/**
 * « Télécharger » on the person's page (/c/): the version validated by the
 * direction, printed here (get_contact_contract_document), which the person
 * signs first (Ibé, 07/11/2026); once PDS signed it in turn, the copy signed
 * by both parties, read through a one-minute slot opened by their token
 * (get_contact_contract_pds_file). Never another person's contract.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/c/[token]/contrat/[contractId]">,
) {
  const { token, contractId } = await params;
  if (!/^[0-9a-f]{64}$/.test(token) || !z.uuid().safeParse(contractId).success)
    return notFoundResponse();
  const supabase = await createClient();
  const signed = pdsFile.safeParse(
    (
      await supabase.rpc("get_contact_contract_pds_file", {
        p_contact_token: token,
        p_contract_id: contractId,
      })
    ).data,
  );
  if (signed.success) {
    const { data: file, error: readError } = await supabase.storage
      .from("contract-files")
      .download(signed.data.path);
    if (file)
      return pdfResponse(
        new Uint8Array(await file.arrayBuffer()),
        signed.data.file_name,
        "contrat.pdf",
      );
    console.error("[contact-contract] signed file:", readError?.message);
  }
  const { data, error } = await supabase.rpc("get_contact_contract_document", {
    p_contact_token: token,
    p_contract_id: contractId,
  });
  if (error) console.error("[contact-contract]:", error.message);
  const parsed = document.safeParse(data);
  if (!parsed.success) return notFoundResponse();
  try {
    const pdf = await contractPdf({
      title: parsed.data.title,
      body: parsed.data.body,
      letterhead: await loadContractLetterhead(supabase, contractId, token),
    });
    return pdfResponse(
      pdf,
      documentFileName(`${parsed.data.title} v${parsed.data.version}`),
      "contrat.pdf",
    );
  } catch (failure) {
    console.error("[contact-contract] pdf failed:", failure);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }
}
