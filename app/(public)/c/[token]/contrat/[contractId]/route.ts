import { z } from "zod";

import { documentFileName } from "@/lib/legal/contracts/document-name";
import { documentHtml } from "@/lib/legal/contracts/document-pdf";
import {
  notFoundResponse,
  pdfResponse,
} from "@/lib/legal/signed-returns/document-response";
import { htmlToPdf } from "@/lib/pdf/render";
import { createClient } from "@/lib/supabase/server";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

const document = z.object({
  title: z.string(),
  version: z.number(),
  body: z.string(),
});

/**
 * « Télécharger » on the person's page (/c/): the version of their contract
 * validated by the direction, once it is sent to them. Read by their token
 * (get_contact_contract_document): never another person's contract.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/c/[token]/contrat/[contractId]">,
) {
  const { token, contractId } = await params;
  if (!/^[0-9a-f]{64}$/.test(token) || !z.uuid().safeParse(contractId).success)
    return notFoundResponse();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_contact_contract_document", {
    p_contact_token: token,
    p_contract_id: contractId,
  });
  if (error) console.error("[contact-contract]:", error.message);
  const parsed = document.safeParse(data);
  if (!parsed.success) return notFoundResponse();
  try {
    const pdf = await htmlToPdf(
      documentHtml({ title: parsed.data.title, body: parsed.data.body }),
    );
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
