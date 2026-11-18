"use client";

import { IconLoader } from "nucleo-sharp-essential";
import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { IconDownload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { core } from "@/lib/i18n/fr/core";

const fr = { pdf: core.pdf };

// A PDF file always starts with these bytes: anything else (a login page
// after an expired session, an error page) is never saved as the PDF.
const PDF_MAGIC = "%PDF-";

async function isPdf(blob: Blob): Promise<boolean> {
  if (blob.size < PDF_MAGIC.length) return false;
  const head = await blob.slice(0, PDF_MAGIC.length).text();
  return head === PDF_MAGIC;
}

/**
 * Downloads the PDF the server makes at `href` as `fileName`, the same way
 * as « Exporter en PDF » (a gesture that downloads after another action:
 * « Générer un brouillon »). Never saves what is not a PDF.
 */
export async function downloadPdf(
  href: string,
  fileName: string,
  failedLabel: string,
  // A POST with a body (a text PO laid out, /api/assistant/pdf); `csv`:
  // the file is a CSV, saved as it comes (PO's exports).
  options: { init?: RequestInit; csv?: boolean } = {},
): Promise<boolean> {
  const t = fr.pdf;
  let blob: Blob;
  try {
    const response = await fetch(href, { cache: "no-store", ...options.init });
    if (response.status === 401) {
      toast.error(t.expired);
      return false;
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[pdf] generation failed", response.status, body);
      toast.error(failedLabel);
      return false;
    }
    blob = await response.blob();
    if (!options.csv && !(await isPdf(blob))) {
      console.error(
        "[pdf] not a PDF",
        response.headers.get("content-type"),
        blob.size,
      );
      toast.error(t.notPdf);
      return false;
    }
  } catch (error) {
    console.error("[pdf] request failed", error);
    toast.error(failedLabel);
    return false;
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
    toast.success(options.csv ? t.fileReady : t.ready);
    return true;
  } catch (error) {
    console.error("[pdf] download failed", error);
    toast.error(t.downloadFailed);
    return false;
  }
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
  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    setExporting(true);
    try {
      await downloadPdf(href, fileName, failedLabel);
    } finally {
      setExporting(false);
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
