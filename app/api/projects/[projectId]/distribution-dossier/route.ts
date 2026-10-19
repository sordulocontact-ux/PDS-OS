import { getAccess } from "@/lib/auth/dal";
import { dossierHtml } from "@/lib/distribution/dossier-html";
import { loadDistributionView } from "@/lib/distribution/view";
import { fr } from "@/lib/i18n/fr";
import { htmlToPdf } from "@/lib/pdf/render";
import { getProject } from "@/lib/projects/queries";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

/**
 * The Distribution's delivery file as a PDF (proto « Exporter en PDF »): the
 * version decided (its snapshot) or the one being prepared (the sources
 * now). Read with the user's session: RLS decides who sees it.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/projects/[projectId]/distribution-dossier">,
) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project || project.stages.length === 0)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  const view = await loadDistributionView(project, access);
  const t = fr.distributionJourney.dossier;
  const open = view.open;
  const number = open?.number ?? (view.versions[0]?.number ?? 0) + 1;
  const html = dossierHtml({
    title: project.title,
    number,
    state: !open
      ? t.preparing
      : open.status === "approved"
        ? t.pills.approved
        : t.pills.pending,
    sections: open?.snapshot?.sections ?? view.sections,
  });
  let pdf: Uint8Array;
  try {
    pdf = await htmlToPdf(html, { pageNumbers: true });
  } catch (error) {
    console.error("[distribution-dossier] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }
  const name = t.pdfFileName(
    project.title.replace(/[\/:*?"<>|]+/g, " ").trim(),
    number,
  );
  return new Response(
    new Blob([pdf as BlobPart], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="dossier.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
