import {
  reportHtml,
  scopedReport,
  type ReportScope,
} from "@/lib/calls/closure";
import { loadCallClosures } from "@/lib/calls/closure-queries";
import { getAccess } from "@/lib/auth/dal";
import { htmlToPdf } from "@/lib/pdf/render";
import { createClient } from "@/lib/supabase/server";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

/**
 * A closed version of a call's report as a PDF (PROJ-AMEL-01): never the
 * transcription nor the audio. Whoever sees the call gets the scope asked;
 * a member it was shared with gets what was shared (the summary when only
 * the summary was). Read with the user's session: RLS decides.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/calls/[callId]/report">,
) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { callId } = await params;
  const url = new URL(request.url);
  const asked: ReportScope =
    url.searchParams.get("scope") === "summary" ? "summary" : "full";
  const supabase = await createClient();
  const [{ data: call }, { closures, shares }] = await Promise.all([
    supabase
      .from("calls")
      .select("title, occurred_at")
      .eq("id", callId)
      .maybeSingle(),
    loadCallClosures(callId),
  ]);
  const version = Number(url.searchParams.get("v"));
  const closure = Number.isInteger(version)
    ? closures.find((c) => c.version === version)
    : closures[0];
  if (!closure)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  // Without the call, only what was shared with them.
  const scope: ReportScope = call
    ? asked
    : shares.some((s) => s.closureId === closure.id && s.scope === "full")
      ? asked
      : "summary";
  const title = call?.title ?? closure.content.call?.title ?? "";
  let pdf: Uint8Array;
  try {
    pdf = await htmlToPdf(
      reportHtml(
        scopedReport(closure.content, scope),
        {
          title,
          occurredAt:
            call?.occurred_at ??
            closure.content.call?.occurredAt ??
            closure.closedAt,
        },
        closure.version,
      ),
    );
  } catch (error) {
    console.error("[call-report] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }
  const name = `Compte rendu ${title} v${closure.version}.pdf`;
  return new Response(
    new Blob([pdf as BlobPart], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="compte-rendu.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
