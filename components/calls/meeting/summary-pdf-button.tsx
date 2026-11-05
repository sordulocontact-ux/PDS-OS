import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { meeting } from "@/lib/i18n/fr/meeting";

const fr = { meeting };

/** « Voir le PDF » of a sent summary, in the head of its card. */
export function SummaryPdfButton({ href }: { href: string }) {
  const t = fr.meeting.summary.pdf;
  return (
    <PdfExportButton
      href={href}
      fileName={`${t.name}.pdf`}
      label={t.view}
      pendingLabel={t.preparing}
      failedLabel={t.failed}
      variant="outline"
      size="sm"
    />
  );
}
