import { getAccess } from "@/lib/auth/dal";
import { creativeBriefHtml } from "@/lib/design/brief-html";
import { liveCreativeBrief } from "@/lib/design/brief-live";
import { briefStatus } from "@/lib/design/brief-status";
import { loadCreativeBriefs, sameBrief } from "@/lib/design/brief-store";
import { fr } from "@/lib/i18n/fr";
import { htmlToPdf } from "@/lib/pdf/render";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

/**
 * One stored version of the Brief créatif as a PDF (MKT-C2-12): drawn from
 * the version's content, as it was created — never from the live project,
 * which only says whether that version is still up to date. Read with the
 * user's session: RLS decides who sees it.
 */
export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/projects/[projectId]/creative-briefs/[number]">,
) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { projectId, number } = await params;
  const [briefs, live] = await Promise.all([
    loadCreativeBriefs(projectId),
    liveCreativeBrief(projectId, access),
  ]);
  const brief = briefs.find((b) => String(b.number) === number);
  if (!brief || !live)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });

  const supabase = await createClient();
  const { data: author } = brief.createdBy
    ? await supabase
        .from("people")
        .select("first_name, last_name")
        .eq("id", brief.createdBy)
        .maybeSingle()
    : { data: null };
  const status = briefStatus({
    number: brief.number,
    latest: briefs[0].number,
    changed: !sameBrief(briefs[0].content, live.content),
    stageState: live.data.stage?.state ?? null,
  });
  const html = creativeBriefHtml({
    content: brief.content,
    number: brief.number,
    author: author ? personName(author.first_name, author.last_name) : "",
    createdAt: brief.createdAt,
    status: fr.conceptionDirection.brief.document.statuses[status],
  });

  let pdf: Uint8Array;
  try {
    pdf = await htmlToPdf(html, { pageNumbers: true });
  } catch (error) {
    console.error("[creative-briefs] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }
  const title = live.title.replace(/[\/:*?"<>|]+/g, " ").trim();
  const name = fr.conceptionDirection.brief.document.pdfFileName(
    title || "projet",
    brief.number,
  );
  return new Response(
    new Blob([pdf as BlobPart], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="brief.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
