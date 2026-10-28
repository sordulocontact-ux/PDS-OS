import { after } from "next/server";

import { getAccess } from "@/lib/auth/dal";
import { briefFileName } from "@/lib/framing/brief-pdf";
import {
  keepBriefPdf,
  keptBriefPdf,
  printBriefPdf,
} from "@/lib/framing/brief-pdf-file";
import { buildBriefSnapshot, snapshotOf } from "@/lib/framing/brief-snapshot";
import { loadFramingKnowledge } from "@/lib/framing/knowledge";
import { createClient } from "@/lib/supabase/server";

// Printing (a browser started) takes a few seconds, more on a cold start;
// a version sent is printed once and read back afterwards.
export const maxDuration = 60;

/**
 * The Brief as a PDF file, downloaded (never the print dialog): the version
 * the page shows (`?version=n`, the latest by default) exactly as it was
 * written, or the Cadrage as it stands when no version exists yet. Read with
 * the user's session: RLS decides who sees it. A sent version's PDF is kept
 * in Storage (lib/framing/brief-pdf-file.ts): only the first download, or
 * the one at sending, prints it (Sacha 28/10/2026, « super long »).
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
  const asked = new URL(request.url).searchParams.get("version");
  const supabase = await createClient();
  // The project and its versions only: the whole Cadrage is read when
  // there is no version to print, nothing else.
  const [{ data: project }, { data: briefs }] = await Promise.all([
    supabase.from("projects").select("title").eq("id", projectId).maybeSingle(),
    supabase
      .from("framing_briefs")
      .select("id, version, state, sent_at, content")
      .eq("project_id", projectId)
      .order("version", { ascending: false }),
  ]);
  if (!project) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const latest = asked
    ? (briefs ?? []).find((b) => String(b.version) === asked)
    : (briefs ?? [])[0];
  // A version that does not exist is never replaced by another one.
  if (asked && !latest) {
    return Response.json(
      { ok: false, error: "version_not_found" },
      { status: 404 },
    );
  }

  let pdf: Uint8Array | null = latest ? await keptBriefPdf(latest) : null;
  if (!pdf) {
    let snapshot = latest ? snapshotOf(latest.content) : null;
    if (!snapshot) {
      const knowledge = await loadFramingKnowledge(projectId, access);
      if (!knowledge) {
        return Response.json(
          { ok: false, error: "not_found" },
          { status: 404 },
        );
      }
      snapshot = buildBriefSnapshot(knowledge);
    }
    try {
      pdf = await printBriefPdf(snapshot, latest ?? null);
    } catch (error) {
      console.error(
        `[framing-brief] pdf failed (project ${projectId}, version ${latest?.version ?? "live"}):`,
        error,
      );
      return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
    }
    // Kept after the response: the download does not wait for the upload.
    const printed = pdf;
    if (latest) after(() => keepBriefPdf(latest, printed));
  }

  const name = briefFileName(project.title);
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
