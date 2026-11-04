import { SourcedValues } from "@/components/contracts/sourced-values";
import { ReviseDocumentButton } from "@/components/contracts/revise-document-button";
import { PageSection } from "@/components/shell/page-section";
import { DocumentCard } from "@/components/ui/document-card";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { routes } from "@/lib/auth/redirects";
import { contracts } from "@/lib/i18n/fr/contracts";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import type { ContractDocument } from "@/lib/legal/contracts/document";
import type { ContractCardData } from "@/lib/legal/contracts/document-card";
import { documentFileName } from "@/lib/legal/contracts/document-name";
import { CONTRACT_FIELD_IDS, formatFee } from "@/lib/legal/contracts/fields";
import { formatShortDay } from "@/lib/utils/day";

const fr = { contracts, legalContracts, legalDocuments };

/**
 * The document of a contract generated from a template (Juridique 03), in
 * head of the page (proto « Contrats »): the template and version it came
 * from, the document and its version (« Projet de contrat », or signed by
 * the party), « Voir le PDF » and « Modifier une clause », what changed
 * since the v1, then each value injected with its source — laid out as the
 * proto (Sacha, 30/10/2026): the file on its tile, the change as one line,
 * the values in two columns.
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
  // The values in the order a template is written: the person, the
  // project, then the agreement.
  const rank = (id: string) => {
    const at = (CONTRACT_FIELD_IDS as readonly string[]).indexOf(id);
    return at === -1 ? CONTRACT_FIELD_IDS.length : at;
  };
  const values = [...document.fields]
    .sort((a, b) => rank(a.id) - rank(b.id))
    .map((f) => ({ ...f, source: f.source || null }));
  if (document.financialNeedCents)
    values.push({
      id: "financial-need",
      label: t.financialNeed,
      value: fr.legalContracts.agreements.waitingInvoice(
        formatFee(document.financialNeedCents),
      ),
      source: null,
    });
  // What changed: the reason given with the new version, else the clauses.
  const change =
    latest.version > 1 && latest.comment
      ? d.changed(
          latest.version,
          latest.comment.replace(/[.\s]+$/, ""),
          latest.by,
          formatShortDay(latest.at, { bare: true }),
        )
      : changes.length > 0
        ? `${c.changedSince} : ${changes
            .map((x) =>
              c.change(
                c.clauses[x.clause ?? "other"] ?? c.clauses.other,
                x.by,
                x.version,
                x.text,
              ),
            )
            .join(" · ")}`
        : null;
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
        change={change}
      >
        <SourcedValues
          values={values}
          className="rounded-none border-0 px-3.5"
        />
      </DocumentCard>
    </PageSection>
  );
}
