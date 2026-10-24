import { getAccess } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { sacem725Pdf } from "@/lib/legal/formalities/bulletin-pdf";
import { createClient } from "@/lib/supabase/server";

/**
 * « Générer un brouillon » (proto « Projet complet », Déclaration SACEM):
 * the official 725 bulletin filled with the dossier's values as they are
 * saved, « BROUILLON — ne pas signer » across each page. No
 * version is made, nothing is kept: a draft is never signed. Read with the
 * user's session (RLS: manage_legal).
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/legal/formalities/[formalityId]/draft">,
) {
  const access = await getAccess();
  if (access.state !== "approved") {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { formalityId } = await params;
  const supabase = await createClient();
  const [{ data: formality }, { data: values }] = await Promise.all([
    supabase
      .from("legal_formalities")
      .select("master_id")
      .eq("id", formalityId)
      .maybeSingle(),
    supabase
      .from("legal_formality_values")
      .select("field_key, value, source")
      .eq("formality_id", formalityId),
  ]);
  if (!formality) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const content = Object.fromEntries(
    (values ?? []).map((v) => [
      v.field_key,
      { value: v.value as unknown, source: v.source ?? "" },
    ]),
  );
  let pdf: Uint8Array;
  try {
    pdf = await sacem725Pdf(content, fr.legalDocuments.bulletin.draftMark);
  } catch (error) {
    console.error("[formality-draft] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }
  return new Response(
    new Blob([pdf as BlobPart], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="brouillon-725.pdf"`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
