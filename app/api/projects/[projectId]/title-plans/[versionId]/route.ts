import { getAccess } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { htmlToPdf } from "@/lib/pdf/render";
import { titlePlanHtml } from "@/lib/projects/title-plan/html";
import { titlePlanOf } from "@/lib/projects/title-plan/model";
import { createClient } from "@/lib/supabase/server";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

/**
 * One version of a title's Plan de sortie (lot 14), drawn from its stored
 * document as it was recorded — never from the live plan: its page
 * (« Voir ») or, with ?format=pdf, its PDF (16:9, the page size the HTML
 * sets). Read with the user's session: RLS decides who sees it (whoever
 * sees the project).
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/projects/[projectId]/title-plans/[versionId]">,
) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { projectId, versionId } = await params;
  const supabase = await createClient();
  const { data: version } = await supabase
    .from("title_release_plan_versions")
    .select("version, content")
    .eq("id", versionId)
    .eq("project_id", projectId)
    .maybeSingle();
  const content = titlePlanOf(version?.content);
  if (!version || !content)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  const html = titlePlanHtml(content);
  if (new URL(request.url).searchParams.get("format") !== "pdf")
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });

  let pdf: Uint8Array;
  try {
    pdf = await htmlToPdf(html, { cssPage: true });
  } catch (error) {
    console.error("[title-plans] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }
  const title = content.title.replace(/[\/:*?"<>|]+/g, " ").trim();
  const name = fr.titleReleasePlans.doc.pdfFileName(
    title || "titre",
    version.version,
  );
  return new Response(
    new Blob([pdf as BlobPart], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="plan-de-sortie.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
