"use client";

import { IconLoader } from "nucleo-sharp-essential";
import { useState } from "react";
import { toast } from "sonner";

import { IconDownload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

// A PDF file always starts with these bytes: anything else (a login page
// after an expired session, an error page) is never saved as the PDF.
const PDF_MAGIC = "%PDF-";

async function isPdf(blob: Blob): Promise<boolean> {
  if (blob.size < PDF_MAGIC.length) return false;
  const head = await blob.slice(0, PDF_MAGIC.length).text();
  return head === PDF_MAGIC;
}

/**
 * « Exporter en PDF »: the PDF is made on the server (Playwright,
 * lib/pdf/render.ts) and downloaded as a file, never the print dialog. The
 * generation and the download are told apart, and nothing is saved unless
 * the server really sent a PDF (PROJ-BUG-05): never an empty file, never a
 * success that did not happen.
 */
export function PdfExportButton({
  href,
  fileName,
  label,
  pendingLabel,
  failedLabel,
  variant = "default",
  size = "lg",
}: {
  href: string;
  fileName: string;
  label: string;
  pendingLabel: string;
  // The generation failed on the server.
  failedLabel: string;
  variant?: "default" | "outline";
  // « sm » in the head of a document card (DocumentCard).
  size?: "lg" | "sm";
}) {
  const t = fr.pdf;
  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    setExporting(true);
    let blob: Blob;
    try {
      const response = await fetch(href, { cache: "no-store" });
      if (response.status === 401) {
        toast.error(t.expired);
        return;
      }
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.error("[pdf] generation failed", response.status, body);
        toast.error(failedLabel);
        return;
      }
      blob = await response.blob();
      if (!(await isPdf(blob))) {
        console.error(
          "[pdf] not a PDF",
          response.headers.get("content-type"),
          blob.size,
        );
        toast.error(t.notPdf);
        return;
      }
    } catch (error) {
      console.error("[pdf] request failed", error);
      toast.error(failedLabel);
      return;
    } finally {
      setExporting(false);
    }

    try {
      const url = URL.createObjectURL(blob);
      // In the document, and revoked later: Firefox ignores a detached
      // link, Safari cancels a download whose URL is revoked at once.
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success(t.ready);
    } catch (error) {
      console.error("[pdf] download failed", error);
      toast.error(t.downloadFailed);
    }
  }

  return (
    <Button
      size={size}
      variant={variant}
      disabled={exporting}
      aria-busy={exporting}
      onClick={exportPdf}
    >
      {exporting ? (
        <IconLoader aria-hidden className="animate-spin" />
      ) : (
        <IconDownload aria-hidden />
      )}
      {exporting ? pendingLabel : label}
    </Button>
  );
}
