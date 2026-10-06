import { getAccess } from "@/lib/auth/dal";
import { getContract } from "@/lib/contracts/queries";
import { getContractDocument } from "@/lib/legal/contracts/document";
import { documentFileName } from "@/lib/legal/contracts/document-name";
import { documentHtml } from "@/lib/legal/contracts/document-pdf";
import { htmlToPdf } from "@/lib/pdf/render";

// Starting a browser and printing takes a few seconds, more on a cold start.
export const maxDuration = 60;

/**
 * The latest version of a generated contract as a PDF, downloaded (« export »
 * of the ticket's MVP, sent to signature by the team). Read with the user's
 * session: RLS decides who sees the contract.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/contracts/[contractId]/document">,
) {
  const access = await getAccess();
  if (access.state !== "approved") {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { contractId } = await params;
  const [contract, document] = await Promise.all([
    getContract(contractId, access),
    getContractDocument(contractId),
  ]);
  if (!contract || !document) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  let pdf: Uint8Array;
  try {
    pdf = await htmlToPdf(
      documentHtml({ title: contract.title, body: document.latest.body }),
    );
  } catch (error) {
    console.error("[contract-document] pdf failed:", error);
    return Response.json({ ok: false, error: "pdf_failed" }, { status: 500 });
  }

  const name = documentFileName(
    `${contract.title} v${document.latest.version}`,
  );
  return new Response(
    new Blob([pdf as BlobPart], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="contrat.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
