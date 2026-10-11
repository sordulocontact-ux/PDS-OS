import { getAccess } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { htmlToPdf } from "@/lib/pdf/render";
import { marketingReportHtml } from "@/lib/marketing/reports/html";
import { reportFigures } from "@/lib/marketing/reports/model";
import { loadReport } from "@/lib/marketing/reports/queries";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

/**
 * One version of the Marketing report as a PDF file, downloaded: drawn from
 * the version's snapshot, never from the live follow-up, and stamped with the
 * version's identifier and fingerprint. Read with the user's session: RLS
 * decides who sees it, and the budget only reaches those who read it.
 */
export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/projects/[projectId]/marketing-reports/[reportId]">,
) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { projectId, reportId } = await params;
  const report = await loadReport(projectId, reportId, access);
  if (!report)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  const html = marketingReportHtml({
    report,
    snapshot: report.snapshot,
    figures: reportFigures(report.snapshot, report.rulesVersion, report.budget),
    budget: report.budget,
  });

  let pdf: Uint8Array;
  try {
    pdf = await htmlToPdf(html);
  } catch (error) {
    console.error("[marketing-reports] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }
  const title = report.snapshot.projectTitle
    .replace(/[\/:*?"<>|]+/g, " ")
    .trim();
  const name = fr.marketingReview.reports.pdfFileName(
    title || "projet",
    report.version,
  );
  return new Response(
    new Blob([pdf as BlobPart], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bilan.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
