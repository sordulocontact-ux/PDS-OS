import { getAccess } from "@/lib/auth/dal";
import { summaryPdf } from "@/lib/calls/meeting/summary-pdf";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

/**
 * A sent summary of a meeting as a PDF (« Voir le PDF », Sacha 05/11/2026),
 * the same file as the one joined to the outside guests' e-mail. `?v=` a
 * version, the last one by default. Read with the user's session: RLS
 * decides who sees the call and its summaries.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/calls/[callId]/summary">,
) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { callId } = await params;
  const asked = Number(new URL(request.url).searchParams.get("v"));
  const supabase = await createClient();
  let summaries = supabase
    .from("call_summaries")
    .select(
      "version, text, sent_at, recipients, sender:people!call_summaries_sent_by_fkey(first_name, last_name)",
    )
    .eq("call_id", callId);
  if (Number.isInteger(asked) && asked > 0)
    summaries = summaries.eq("version", asked);
  const [{ data: call }, { data: summary }] = await Promise.all([
    supabase
      .from("calls")
      .select("title, occurred_at, project:projects(title)")
      .eq("id", callId)
      .maybeSingle(),
    summaries.order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!summary)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  const sentBy = summary.sender
    ? personName(summary.sender.first_name, summary.sender.last_name)
    : null;
  const recipients = Array.isArray(summary.recipients)
    ? summary.recipients.flatMap((r) =>
        r && typeof r === "object" && "name" in r && typeof r.name === "string"
          ? [r.name]
          : [],
      )
    : [];
  let file: { name: string; pdf: Uint8Array };
  try {
    file = await summaryPdf({
      project: call?.project?.title ?? null,
      call: call?.title ?? "",
      occurredAt: call?.occurred_at ?? summary.sent_at,
      participants: [...(sentBy ? [sentBy] : []), ...recipients],
      text: summary.text,
      sentBy,
      sentAt: summary.sent_at,
      version: summary.version,
    });
  } catch (error) {
    console.error("[call-summary] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }
  return new Response(
    new Blob([file.pdf as BlobPart], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="compte-rendu.pdf"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
