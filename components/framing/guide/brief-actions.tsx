"use client";

import { IconLink } from "nucleo-sharp-essential";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
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
      <PdfExportButton
        href={pdfHref}
        fileName={fileName}
        label={t.print}
        pendingLabel={t.exporting}
        failedLabel={t.pdfFailed}
      />
    </>
  );
}
