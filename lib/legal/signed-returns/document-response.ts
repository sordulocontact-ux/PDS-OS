import "server-only";

// The answer of a document read by a private link: a PDF never kept by a
// shared cache nor indexed, or a 404 that says nothing of why.
export function pdfResponse(pdf: Uint8Array, name: string, fallback: string) {
  return new Response(
    new Blob([pdf as BlobPart], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}

export const notFoundResponse = () =>
  Response.json(
    { ok: false, error: "not_found" },
    { status: 404, headers: { "Cache-Control": "private, no-store" } },
  );
