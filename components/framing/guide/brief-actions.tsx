"use client";

import { IconLink, IconLoader } from "nucleo-sharp-essential";
import { useState } from "react";
import { toast } from "sonner";

import { IconDownload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

/**
 * "Copier le lien" and "Exporter en PDF". The PDF is made on the server
 * (Playwright, lib/pdf/render.ts) and downloaded as a file: no print dialog.
 */
export function BriefActions({
  pdfHref,
  fileName,
}: {
  pdfHref: string;
  fileName: string;
}) {
  const t = fr.framingGuide.brief;
  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    setExporting(true);
    try {
      const response = await fetch(pdfHref);
      if (!response.ok) throw new Error(String(response.status));
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t.pdfFailed);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Button
        size="lg"
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success(t.copied);
          } catch {
            toast.error(fr.framing.errors.generic);
          }
        }}
      >
        <IconLink aria-hidden />
        {t.share}
      </Button>
      <Button size="lg" disabled={exporting} onClick={exportPdf}>
        {exporting ? (
          <IconLoader aria-hidden className="animate-spin" />
        ) : (
          <IconDownload aria-hidden />
        )}
        {exporting ? t.exporting : t.print}
      </Button>
    </>
  );
}
