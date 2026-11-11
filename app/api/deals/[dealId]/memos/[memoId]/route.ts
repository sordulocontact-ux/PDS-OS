import { getAccess } from "@/lib/auth/dal";
import { memoHtml } from "@/lib/deals/memo-pdf";
import { loadDealMemos } from "@/lib/deals/memo-queries";
import { dealName } from "@/lib/deals/names";
import { loadDeal } from "@/lib/deals/queries";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { htmlToPdf } from "@/lib/pdf/render";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

/** A deal memo as a PDF (BIZ 7), for whoever reads the deal (RLS). */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/deals/[dealId]/memos/[memoId]">,
) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { dealId, memoId } = await params;
  const deal = await loadDeal(access, dealId).catch(() => null);
  const memo = deal
    ? (await loadDealMemos(deal.id, deal.kind)).find((m) => m.id === memoId)
    : null;
  if (!deal || !memo)
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  const name = dealName(deal);
  let pdf: Uint8Array;
  try {
    pdf = await htmlToPdf(memoHtml(memo, name));
  } catch (error) {
    console.error("[deal-memo] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }
  const file = dealMemos.pdf.file(name, memo.number);
  return new Response(
    new Blob([pdf as BlobPart], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="deal-memo.pdf"; filename*=UTF-8''${encodeURIComponent(file)}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
