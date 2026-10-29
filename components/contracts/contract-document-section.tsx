import { ReviseDocumentButton } from "@/components/contracts/revise-document-button";
import { PageSection } from "@/components/shell/page-section";
import { DocumentCard } from "@/components/ui/document-card";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { routes } from "@/lib/auth/redirects";
import { contracts } from "@/lib/i18n/fr/contracts";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import type { ContractDocument } from "@/lib/legal/contracts/document";
import type { ContractCardData } from "@/lib/legal/contracts/document-card";
import { documentFileName } from "@/lib/legal/contracts/document-name";
import { formatFee } from "@/lib/legal/contracts/fields";

const fr = { contracts, legalContracts, legalDocuments };

/**
 * The document of a contract generated from a template (Juridique 03), in
 * head of the page (proto « Contrats »): the template and version it came
 * from, the document and its version (« Projet de contrat », or signed by
 * the party), « Voir le PDF » and « Modifier une clause », what changed
 * since the v1, then each value injected with its source.
 */
export function ContractDocumentSection({
  contractId,
  title,
  document,
  card,
  signedBy,
  canRevise,
}: {
  contractId: string;
  title: string;
  document: ContractDocument;
  card: ContractCardData | null;
  // The party whose signed copy came back by their link.
  signedBy: string | null;
  canRevise: boolean;
}) {
  const t = fr.legalContracts.document;
  const c = fr.legalDocuments.contract;
  const d = fr.contracts.document;
  const latest = document.latest;
  const changes = card?.changes ?? [];
  return (
    <PageSection
      card
      id="contract-document"
      title={t.title}
      description={
        document.template
          ? t.description(document.template.name, document.template.version)
          : undefined
      }
    >
      <DocumentCard
        name={d.name(title, latest.version)}
        line={signedBy ? d.signedLine(signedBy) : d.draftLine}
        action={
          <div className="flex flex-wrap gap-2">
            <PdfExportButton
              href={routes.contractDocumentPdf(contractId)}
              fileName={documentFileName(`${title} v${latest.version}`)}
              label={c.pdf}
              pendingLabel={c.pdfPending}
              failedLabel={c.pdfFailed}
              variant="outline"
              size="sm"
            />
            {canRevise && (
              <ReviseDocumentButton
                contractId={contractId}
                body={latest.body}
              />
            )}
          </div>
        }
        change={
          changes.length > 0 && (
            <>
              <b className="font-semibold">{c.changedSince}</b> :{" "}
              {changes
                .map((x) =>
                  c.change(
                    c.clauses[x.clause ?? "other"] ?? c.clauses.other,
                    x.by,
                    x.version,
                    x.text,
                  ),
                )
                .join(" · ")}
            </>
          )
        }
      >
        <FactRows>
          {document.fields.map((f) => (
            <FactRow
              key={f.id}
              label={f.label}
              value={f.value || d.toDecide}
              source={f.source || null}
            />
          ))}
          {document.financialNeedCents ? (
            <FactRow
              label={t.financialNeed}
              value={fr.legalContracts.agreements.waitingInvoice(
                formatFee(document.financialNeedCents),
              )}
            />
          ) : null}
        </FactRows>
      </DocumentCard>
    </PageSection>
  );
}
