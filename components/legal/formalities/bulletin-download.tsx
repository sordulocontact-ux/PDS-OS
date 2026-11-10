import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { routes } from "@/lib/auth/redirects";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import type { FormalityView } from "@/lib/legal/formalities/types";
import { formatDay } from "@/lib/utils/day";
import { fileNamePart } from "@/lib/utils/file-name-part";

const fr = { legalDocuments };

const t = fr.legalDocuments.bulletin;

/** When the SACEM 725 bulletin was last generated and how many signatures it
 * has, said in the head of its `DocumentCard` (proto « Projet complet »,
 * rule 18); null before the first PDF. */
export function bulletinGenerated(f: FormalityView): string | null {
  const latest = f.documents[0];
  if (!latest) return null;
  const signed = f.signatures.filter((s) => s.status === "signed").length;
  return t.generatedOn(formatDay(latest.at), signed, f.signatures.length);
}

/** « Télécharger » the latest bulletin (« Bulletin_725_Neons_v1.pdf »), in
 * the head of its card at every step that follows (signatures, filing, the
 * SACEM's answer). */
export function BulletinDownload({
  title,
  f,
}: {
  title: string;
  f: FormalityView;
}) {
  const latest = f.documents[0];
  if (!latest) return null;
  const name = t.fileName(fileNamePart(title, "Titre"), latest.version);
  return (
    <PdfExportButton
      href={routes.formalityDocumentPdf(f.id, latest.version)}
      fileName={name}
      label={t.download}
      pendingLabel={t.pdfPending}
      failedLabel={t.pdfFailed}
      variant="outline"
      size="sm"
    />
  );
}
