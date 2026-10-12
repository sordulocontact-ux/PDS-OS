import { getAccess } from "@/lib/auth/dal";
import { briefFileName, briefHtml } from "@/lib/framing/brief-pdf";
import { buildBriefSnapshot, snapshotOf } from "@/lib/framing/brief-snapshot";
import { loadFramingKnowledge } from "@/lib/framing/knowledge";
import { htmlToPdf } from "@/lib/pdf/render";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

/**
 * The Brief as a PDF file, downloaded (never the print dialog): the version
 * the page shows (`?version=n`, the latest by default) exactly as it was
 * written, or the Cadrage as it stands when no version exists yet. Read with
 * the user's session: RLS decides who sees it.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/projects/[projectId]/framing-brief">,
) {
  const access = await getAccess();
  if (access.state !== "approved") {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { projectId } = await params;
  const knowledge = await loadFramingKnowledge(projectId, access);
  if (!knowledge) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const asked = new URL(request.url).searchParams.get("version");
  const latest = asked
    ? knowledge.briefs.find((b) => String(b.version) === asked)
    : knowledge.briefs[0];
  // A version that does not exist is never replaced by another one.
  if (asked && !latest) {
    return Response.json(
      { ok: false, error: "version_not_found" },
      { status: 404 },
    );
  }
  const snapshot =
    (latest ? snapshotOf(latest.content) : null) ??
    buildBriefSnapshot(knowledge);

  let pdf: Uint8Array;
  try {
    pdf = await htmlToPdf(
      briefHtml({
        snapshot,
        version: latest?.version ?? null,
        state: latest?.state ?? null,
      }),
    );
  } catch (error) {
    console.error(
      `[framing-brief] pdf failed (project ${projectId}, version ${latest?.version ?? "live"}):`,
      error,
    );
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }

  const name = briefFileName(knowledge.project.title);
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
