import { getAccess } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { briefHtml } from "@/lib/master-workflow/brief-html";
import { loadBriefStep } from "@/lib/master-workflow/brief-step";
import { BRIEF_DATES, type BriefDate } from "@/lib/master-workflow/brief-types";
import { htmlToPdf } from "@/lib/pdf/render";
import { getProject } from "@/lib/projects/queries";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

/**
 * The Brief Mix/Master as a PDF (« Exporter en PDF »): what the engineers
 * receive, without the internal rates. Read with the user's session: RLS
 * decides who sees it.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/projects/[projectId]/master-brief">,
) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project || project.stages.length === 0)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  const step = await loadBriefStep(project, access, null);
  const t = fr.masterBrief;
  const name = (id: string | null) =>
    step.view.engineers.find((e) => e.id === id)?.name ?? null;
  const html = briefHtml({
    project: project.title,
    titles: project.masters.map((m) => m.title),
    state: step.recordedAt ? t.pdf.recorded : t.pdf.draft,
    brief: step.view.brief,
    dates: Object.fromEntries(
      BRIEF_DATES.map((key) => [key, step.dates[key].value]),
    ) as Record<BriefDate, string | null>,
    mix: name(step.view.brief.mixContactId),
    mastering: name(step.view.brief.masteringContactId),
    validator:
      step.view.validators.find(
        (v) => v.personId === step.view.brief.validatorPersonId,
      )?.name ?? null,
  });
  let pdf: Uint8Array;
  try {
    pdf = await htmlToPdf(html, { pageNumbers: true });
  } catch (error) {
    console.error("[master-brief] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }
  const file = t.pdf.fileName(
    project.title.replace(/[\/:*?"<>|]+/g, " ").trim(),
  );
  return new Response(
    new Blob([pdf as BlobPart], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="brief.pdf"; filename*=UTF-8''${encodeURIComponent(file)}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
