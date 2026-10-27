"use client";

import { IconLink } from "nucleo-sharp-essential";

import { CopyButton } from "@/components/ui/copy-button";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { framing } from "@/lib/i18n/fr/framing";
import { framingGuide } from "@/lib/i18n/fr/framing-guide";

const fr = { framing, framingGuide };

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
      <CopyButton
        value={() => window.location.href}
        label={t.share}
        copiedLabel={t.copied}
        failedLabel={fr.framing.errors.generic}
        icon={<IconLink aria-hidden />}
      />
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
