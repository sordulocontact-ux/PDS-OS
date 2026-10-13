import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type { BriefStatus } from "@/lib/design/brief-status";
import { fr } from "@/lib/i18n/fr";
import { creativeBriefTone } from "@/lib/ui/state-tones";

/**
 * A stored version of the Brief créatif as a document (MKT-C2-12): its
 * number, author and date, its status, what changed, and its PDF.
 */
export function BriefDocumentCard({
  projectId,
  projectTitle,
  number,
  meta,
  status,
  changes,
}: {
  projectId: string;
  projectTitle: string;
  number: number;
  // « Créé par … le … ».
  meta: string;
  status: BriefStatus;
  // What it changes from the previous version, or what moved since.
  changes: string | null;
}) {
  const t = fr.conceptionDirection.brief.document;
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-muted p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body-lg font-semibold">
              {t.title(number)}
            </span>
            <StatusBadge tone={creativeBriefTone[status]} size="sm">
              {t.statuses[status]}
            </StatusBadge>
          </div>
          <span className="text-caption text-muted-foreground">{meta}</span>
        </div>
        <PdfExportButton
          href={routes.projectDesignBriefPdf(projectId, number)}
          fileName={t.pdfFileName(projectTitle, number)}
          label={t.pdf}
          pendingLabel={t.exporting}
          failedLabel={t.exportFailed}
          variant="outline"
        />
      </div>
      {changes && <p className="text-body-md">{changes}</p>}
      <p className="text-caption text-muted-foreground">{t.internal}</p>
    </div>
  );
}
