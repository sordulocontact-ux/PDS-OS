import { z } from "zod";

import { getAccess } from "@/lib/auth/dal";
import { strategySnapshotOf } from "@/lib/strategy/brief-snapshot";
import { strategyBriefHtml } from "@/lib/strategy/documents/brief-html";
import { externalDocOf } from "@/lib/strategy/documents/model";
import { documentFileName } from "@/lib/strategy/documents/names";
import { documentHtml } from "@/lib/strategy/documents/render";
import { htmlToPdf } from "@/lib/pdf/render";
import type { DocumentKind } from "@/lib/strategy/workspace";
import { createClient } from "@/lib/supabase/server";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

const ids = z.object({ projectId: z.uuid(), documentId: z.uuid() });

/**
 * A version of a Strategy document as a downloaded PDF file, exactly as it
 * was generated. Read with the user's session: RLS decides who sees it.
 */
export async function GET(
  _request: Request,
  {
    params,
  }: RouteContext<"/api/projects/[projectId]/strategy-documents/[documentId]">,
) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const parsed = ids.safeParse(await params);
  if (!parsed.success)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("strategy_documents")
    .select("kind, version, state, content, projects!inner(title)")
    .eq("id", parsed.data.documentId)
    .eq("project_id", parsed.data.projectId)
    .maybeSingle();
  if (!doc)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });

  let html: string | null = null;
  let fullBleed = false;
  if (doc.kind === "brief") {
    const snapshot = strategySnapshotOf(doc.content);
    if (snapshot)
      html = strategyBriefHtml({
        snapshot,
        version: doc.version,
        state: doc.state,
      });
  } else {
    const external = externalDocOf(doc.content);
    if (external) {
      html = documentHtml(external);
      fullBleed = true;
    }
  }
  if (!html)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });

  let pdf: Uint8Array;
  try {
    pdf = await htmlToPdf(html, { fullBleed });
  } catch (error) {
    console.error("[strategy-document] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }

  const name = documentFileName(
    doc.kind as DocumentKind,
    doc.projects.title,
    doc.version,
  );
  return new Response(
    new Blob([pdf as BlobPart], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
