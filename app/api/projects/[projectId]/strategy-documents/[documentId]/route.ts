import { getAccess } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { htmlToPdf } from "@/lib/pdf/render";
import type { DocumentKind } from "@/lib/strategy/documents/model";
import { documentHtml } from "@/lib/strategy/documents/render";
import { createClient } from "@/lib/supabase/server";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

/**
 * One version of a strategy document as a PDF file, downloaded: drawn from
 * the version's stored content, as it was established — never from the live
 * strategy. Read with the user's session: RLS decides who sees it (the
 * project's members, a reviewer of that version).
 */
export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/projects/[projectId]/strategy-documents/[documentId]">,
) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { projectId, documentId } = await params;
  const supabase = await createClient();
  const [{ data: doc }, { data: project }] = await Promise.all([
    supabase
      .from("strategy_documents")
      .select("kind, version, state, content")
      .eq("id", documentId)
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase.from("projects").select("title").eq("id", projectId).maybeSingle(),
  ]);
  if (!doc)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  const kind = doc.kind as DocumentKind;
  const html = documentHtml({ ...doc, kind });
  if (!html)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });

  let pdf: Uint8Array;
  try {
    pdf = await htmlToPdf(html);
  } catch (error) {
    console.error("[strategy-documents] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }
  const title = (project?.title ?? "").replace(/[\/:*?"<>|]+/g, " ").trim();
  const name = fr.strategyDocuments.pdfFileName(
    title || "projet",
    fr.strategyDocuments.kinds[kind],
    doc.version,
  );
  return new Response(
    new Blob([pdf as BlobPart], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
