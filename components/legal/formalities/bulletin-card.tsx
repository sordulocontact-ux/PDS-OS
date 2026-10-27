import { DocumentCard } from "@/components/ui/document-card";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { routes } from "@/lib/auth/redirects";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import type { FormalityView } from "@/lib/legal/formalities/types";
import { formatDay } from "@/lib/utils/day";
import { fileNamePart } from "@/lib/utils/file-name-part";

const fr = { legalDocuments };

const t = fr.legalDocuments.bulletin;

/**
 * The SACEM 725 bulletin in head of its démarche once generated (proto
 * « Projet complet », rule 18): « Bulletin_725_Neons_v1.pdf », when it was
 * generated and how many signatures it has, « Télécharger ». The same card
 * at every step that follows (signatures, filing, the SACEM's answer).
 */
export function BulletinCard({
  title,
  f,
}: {
  title: string;
  f: FormalityView;
}) {
  const latest = f.documents[0];
  if (!latest) return null;
  const name = t.fileName(fileNamePart(title, "Titre"), latest.version);
  const signed = f.signatures.filter((s) => s.status === "signed").length;
  return (
    <DocumentCard
      name={name}
      line={t.generatedOn(formatDay(latest.at), signed, f.signatures.length)}
      action={
        <PdfExportButton
          href={routes.formalityDocumentPdf(f.id, latest.version)}
          fileName={name}
          label={t.download}
          pendingLabel={t.pdfPending}
          failedLabel={t.pdfFailed}
          variant="outline"
          size="sm"
        />
      }
    />
  );
}
