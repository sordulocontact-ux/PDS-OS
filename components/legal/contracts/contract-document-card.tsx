import { ContractValueList } from "@/components/legal/contracts/contract-value-list";
import { DocumentCard } from "@/components/ui/document-card";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { isBlocking } from "@/lib/legal/contracts/completeness";
import type { ContractCardData } from "@/lib/legal/contracts/document-card";
import { fileNamePart } from "@/lib/utils/file-name-part";
import type {
  AgreementField,
  AgreementRow,
} from "@/lib/legal/contracts/mapping";

const t = fr.legalDocuments.contract;

/** « Contrat_Kader_Neons_v1.pdf ». Client-safe. */
export function contractFileName(
  person: string,
  project: string,
  version: number,
) {
  const last =
    person
      .replace(/\(.*?\)/g, "")
      .trim()
      .split(/\s+/)
      .pop() ?? person;
  return t.fileName(
    fileNamePart(last, "Contrat"),
    fileNamePart(project, "Projet"),
    version,
  );
}

/**
 * A person's contract as the document in head of its card (proto « Projet
 * complet », rule 18): « Contrat_Kader_Neons_v1.pdf », generated from the
 * values below (how many still block), « Voir le PDF », what changed since
 * the v1 (clause, who, version, the words), then every value with its
 * source, fixed where it lives. The same card at every step that follows.
 */
export function ContractDocumentCard({
  row,
  data,
  projectTitle,
  fixHref,
}: {
  row: AgreementRow;
  data: ContractCardData;
  projectTitle: string;
  fixHref?: (field: AgreementField) => string | null;
}) {
  const contractId = row.contract?.id;
  if (!contractId) return null;
  const blocking = row.fields.filter((f) => isBlocking(f.status)).length;
  const name = contractFileName(row.name, projectTitle, data.version);
  return (
    <DocumentCard
      name={name}
      line={t.generated(blocking, row.fields.length)}
      action={
        <PdfExportButton
          href={routes.contractDocumentPdf(contractId)}
          fileName={name}
          label={t.pdf}
          pendingLabel={t.pdfPending}
          failedLabel={t.pdfFailed}
          variant="outline"
          size="sm"
        />
      }
      change={
        data.changes.length > 0 && (
          <>
            <b className="font-semibold">{t.changedSince}</b> :{" "}
            {data.changes
              .map((c) =>
                t.change(
                  t.clauses[c.clause ?? "other"] ?? t.clauses.other,
                  c.by,
                  c.version,
                  c.text,
                ),
              )
              .join(" · ")}
          </>
        )
      }
    >
      <ContractValueList
        fields={row.fields}
        personName={row.name}
        fixHref={fixHref}
      />
    </DocumentCard>
  );
}
