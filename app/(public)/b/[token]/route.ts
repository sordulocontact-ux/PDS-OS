import { z } from "zod";

import { briefFileName } from "@/lib/framing/brief-pdf";
import { printBriefPdf } from "@/lib/framing/brief-pdf-file";
import { snapshotOf } from "@/lib/framing/brief-snapshot";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

const shared = z.object({
  version: z.number(),
  state: z.string(),
  sent_at: z.string().nullable(),
  decided_at: z.string().nullable(),
  content: z.unknown(),
});

const HEADERS = {
  // Never kept by a shared cache nor indexed, no referrer: the token is the
  // key and the link can be revoked.
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
};

/**
 * « Copier le lien » of the Brief de cadrage (retour d'Ibé du 02/11/2026):
 * the PDF of the project's latest version sent, opened in the browser,
 * read without an account through get_shared_framing_brief (the database
 * checks the token, its expiry and its revocation). Printed on each opening:
 * the kept PDFs are read with a member's session only.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/b/[token]">,
) {
  const { token } = await params;
  const parsed = z.uuid().safeParse(token);
  const supabase = await createClient();
  const { data, error } = parsed.success
    ? await supabase.rpc("get_shared_framing_brief", { p_token: parsed.data })
    : { data: null, error: null };
  if (error) console.error("[shared-framing-brief]:", error.message);
  const brief = shared.safeParse(data);
  const snapshot = brief.success ? snapshotOf(brief.data.content) : null;
  if (!brief.success || !snapshot)
    return new Response(fr.framingJourney.brief.unavailable, {
      status: 404,
      headers: { ...HEADERS, "Content-Type": "text/plain; charset=utf-8" },
    });
  try {
    const pdf = await printBriefPdf(snapshot, {
      version: brief.data.version,
      state: brief.data.state,
      sent_at: brief.data.sent_at,
      decided_at: brief.data.decided_at,
    });
    const name = briefFileName(snapshot.project.title);
    return new Response(
      new Blob([pdf as BlobPart], { type: "application/pdf" }),
      {
        headers: {
          ...HEADERS,
          "Content-Type": "application/pdf",
          // Opened in the browser, saved under the Brief's name.
          "Content-Disposition": `inline; filename="brief.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
        },
      },
    );
  } catch (failure) {
    console.error("[shared-framing-brief] pdf failed:", failure);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }
}
