import { z } from "zod";

import { getAccess } from "@/lib/auth/dal";
import { assistantShow } from "@/lib/i18n/fr/assistant-show";
import { htmlToPdf } from "@/lib/pdf/render";
import { pdfFileName, textDocumentHtml } from "@/lib/pdf/text-document";
import { parisPlace } from "@/lib/utils/calendar-period";
import { formatDay } from "@/lib/utils/day";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

const bodySchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(30000),
});

/**
 * A text PO prepared, laid out as a PDF (make_pdf « texte », docs/
 * ASSISTANT.md § 3 sexies). The text comes in the request's body: it is
 * the member's own conversation, printed for them; nothing is stored and
 * no data of the app is read here.
 */
export async function POST(request: Request) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { ok: false, error: "invalid_input" },
      { status: 400 },
    );
  const { title, body } = parsed.data;
  const html = textDocumentHtml({
    title,
    body,
    foot: assistantShow.files.by(
      access.firstName,
      formatDay(parisPlace(new Date()).day, { weekday: false }),
    ),
  });
  let pdf: Uint8Array;
  try {
    pdf = await htmlToPdf(html, { pageNumbers: true });
  } catch (error) {
    console.error("[assistant-pdf] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }
  const name = pdfFileName(title);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
