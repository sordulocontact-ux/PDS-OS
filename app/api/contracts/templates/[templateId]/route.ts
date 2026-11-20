import { getAccess } from "@/lib/auth/dal";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { documentFileName } from "@/lib/legal/contracts/document-name";
import { templateHtml } from "@/lib/legal/contracts/document-pdf";
import { asContractLanguage } from "@/lib/legal/contracts/language";
import { htmlToPdf } from "@/lib/pdf/render";
import { createClient } from "@/lib/supabase/server";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

/**
 * A contract template as a PDF (Ibé, 18/11/2026: « recevoir le modèle en
 * PDF »): its text, each value it fills shown as a blank to fill. `?view=1`
 * opens it in the browser's tab; `?format=html` gives the same document as a
 * page, for the preview frame of the template's page (no script: a sandbox
 * policy). Read with the user's session: RLS decides who sees the template
 * (manage_legal, manage_contracts, validate_contracts).
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/contracts/templates/[templateId]">,
) {
  const access = await getAccess();
  if (access.state !== "approved") {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const id = catalogIdSchema.safeParse((await params).templateId);
  if (!id.success) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const supabase = await createClient();
  const { data: template } = await supabase
    .from("contract_templates")
    .select("name, version, body, language")
    .eq("id", id.data)
    .maybeSingle();
  if (!template) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const title = `${template.name} v${template.version}`;
  const html = templateHtml({
    title,
    body: template.body,
    language: asContractLanguage(template.language),
  });
  const url = new URL(request.url);
  if (url.searchParams.get("format") === "html") {
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "sandbox; default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com",
        "Cache-Control": "private, no-store",
      },
    });
  }
  let pdf: Uint8Array;
  try {
    pdf = await htmlToPdf(html);
  } catch (error) {
    console.error("[contract-template] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }

  return new Response(
    new Blob([pdf as BlobPart], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${url.searchParams.get("view") === "1" ? "inline" : "attachment"}; filename="modele.pdf"; filename*=UTF-8''${encodeURIComponent(documentFileName(title))}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
