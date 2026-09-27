import { getAccess } from "@/lib/auth/dal";
import { briefFileName, briefHtml } from "@/lib/framing/brief-pdf";
import { briefFacts, briefObjective } from "@/lib/framing/brief-summary";
import { loadFraming } from "@/lib/framing/queries";
import { htmlToPdf } from "@/lib/pdf/render";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

/**
 * The shareable Brief as a PDF file, downloaded (never the print dialog).
 * Read with the user's session: RLS decides who sees the project.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/projects/[projectId]/framing-brief">,
) {
  const access = await getAccess();
  if (access.state !== "approved") {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { projectId } = await params;
  const data = await loadFraming(projectId, access);
  if (!data) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  let pdf: Uint8Array;
  try {
    pdf = await htmlToPdf(
      briefHtml({
        projectTitle: data.project.title,
        objective: briefObjective(data),
        facts: briefFacts(data),
      }),
    );
  } catch (error) {
    console.error("[framing-brief] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }

  const name = briefFileName(data.project.title);
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
