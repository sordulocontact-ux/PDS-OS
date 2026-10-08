import { getAccess } from "@/lib/auth/dal";
import { sacem725Pdf } from "@/lib/legal/formalities/bulletin-pdf";
import { createClient } from "@/lib/supabase/server";

/**
 * A version of a formality's bulletin as a PDF (ticket Juridique 06,
 * « PO génère une version du bulletin »): the official SACEM 725 bulletin
 * filled with the version's values, downloaded. Read with the user's
 * session: RLS decides who sees the formality (manage_legal).
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/legal/formalities/[formalityId]/document">,
) {
  const access = await getAccess();
  if (access.state !== "approved") {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { formalityId } = await params;
  const version = Number(new URL(request.url).searchParams.get("version"));
  const supabase = await createClient();
  const [{ data: formality }, { data: document }] = await Promise.all([
    supabase
      .from("legal_formalities")
      .select("master_id")
      .eq("id", formalityId)
      .maybeSingle(),
    supabase
      .from("legal_formality_documents")
      .select("version, content")
      .eq("formality_id", formalityId)
      .eq("version", Number.isInteger(version) && version > 0 ? version : 0)
      .maybeSingle(),
  ]);
  if (!formality || !document) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const { data: master } = await supabase
    .from("masters")
    .select("title")
    .eq("id", formality.master_id)
    .maybeSingle();
  const title = master?.title ?? "";

  let pdf: Uint8Array;
  try {
    pdf = await sacem725Pdf(
      document.content as Record<string, { value: unknown; source: string }>,
    );
  } catch (error) {
    console.error("[formality-document] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }
  const name = `SACEM 725 - ${title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "titre"} - v${document.version}.pdf`;
  return new Response(
    new Blob([pdf as BlobPart], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sacem-725.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
