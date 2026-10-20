import { z } from "zod";

import { sacem725Pdf } from "@/lib/legal/formalities/bulletin-pdf";
import {
  notFoundResponse,
  pdfResponse,
} from "@/lib/legal/signed-returns/document-response";
import { createClient } from "@/lib/supabase/server";

const document = z.object({
  title: z.string(),
  version: z.number(),
  content: z.record(
    z.string(),
    z.object({ value: z.unknown(), source: z.string() }),
  ),
});

/**
 * « Télécharger » on the person's page (/c/): the version of the SACEM 725
 * bulletin they sign, the official form filled. Read by their token
 * (get_contact_bulletin_document): only a bulletin they sign, in this
 * project.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/c/[token]/bulletin/[signatureId]">,
) {
  const { token, signatureId } = await params;
  if (!/^[0-9a-f]{64}$/.test(token) || !z.uuid().safeParse(signatureId).success)
    return notFoundResponse();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_contact_bulletin_document", {
    p_contact_token: token,
    p_signature_id: signatureId,
  });
  if (error) console.error("[contact-bulletin]:", error.message);
  const parsed = document.safeParse(data);
  if (!parsed.success) return notFoundResponse();
  try {
    const pdf = await sacem725Pdf(parsed.data.content);
    const title =
      parsed.data.title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "titre";
    return pdfResponse(
      pdf,
      `SACEM 725 - ${title} - v${parsed.data.version}.pdf`,
      "sacem-725.pdf",
    );
  } catch (failure) {
    console.error("[contact-bulletin] pdf failed:", failure);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }
}
