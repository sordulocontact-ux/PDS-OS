"use client";

import { IconLoader } from "nucleo-sharp-essential";
import { useState } from "react";
import { toast } from "sonner";

import { IconDownload } from "@/components/icons";
import { Button } from "@/components/ui/button";

/**
 * « Exporter en PDF »: the PDF is made on the server (Playwright,
 * lib/pdf/render.ts) and downloaded as a file, never the print dialog; a
 * failure says so instead of opening an error page.
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
  failedLabel: string;
  variant?: "default" | "outline";
  // `sm` among a document's actions (Strategy documents).
  size?: "lg" | "sm";
}) {
  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    setExporting(true);
    try {
      const response = await fetch(href);
      if (!response.ok) throw new Error(String(response.status));
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(failedLabel);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button size={size} variant={variant} disabled={exporting} onClick={exportPdf}>
      {exporting ? (
        <IconLoader aria-hidden className="animate-spin" />
      ) : (
        <IconDownload aria-hidden />
      )}
      {exporting ? pendingLabel : label}
    </Button>
  );
}
