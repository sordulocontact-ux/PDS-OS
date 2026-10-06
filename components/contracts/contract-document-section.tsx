import { ReviseDocumentButton } from "@/components/contracts/revise-document-button";
import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { ContractDocument } from "@/lib/legal/contracts/document";
import { documentFileName } from "@/lib/legal/contracts/document-name";
import { formatFee } from "@/lib/legal/contracts/fields";
import { formatDateTime } from "@/lib/release/format";

/**
 * The document of a contract generated from a template (Juridique 03): the
 * template and version it came from, each value injected with its source,
 * the text as it stands, its versions and journal; « Modifier une clause »
 * and « Exporter en PDF ».
 */
export function ContractDocumentSection({
  contractId,
  title,
  document,
  canRevise,
}: {
  contractId: string;
  title: string;
  document: ContractDocument;
  canRevise: boolean;
}) {
  const t = fr.legalContracts.document;
  const latest = document.latest;
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
      action={
        <div className="flex flex-wrap gap-2">
          {canRevise && (
            <ReviseDocumentButton contractId={contractId} body={latest.body} />
          )}
          <PdfExportButton
            href={routes.contractDocumentPdf(contractId)}
            fileName={documentFileName(`${title} v${latest.version}`)}
            label={t.export}
            pendingLabel={fr.framingGuide.brief.exporting}
            failedLabel={fr.framingGuide.brief.pdfFailed}
            variant="outline"
          />
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <FactList
          facts={[
            ...document.fields.map((f) => ({
              label: f.label,
              value: f.source ? `${f.value} · ${f.source}` : f.value,
            })),
            ...(document.financialNeedCents
              ? [
                  {
                    label: t.financialNeed,
                    value: fr.legalContracts.agreements.waitingInvoice(
                      formatFee(document.financialNeedCents),
                    ),
                  },
                ]
              : []),
          ]}
        />
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">
            {t.text} · {t.version(latest.version)}
          </h3>
          <div className="max-h-[32rem] overflow-y-auto overscroll-contain rounded-xl border bg-background p-4 break-words whitespace-pre-wrap">
            {latest.body}
          </div>
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t.versions}</h3>
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {document.events.map((e) => (
              <li key={e.id}>
                {t.eventLine(e.label, e.by, formatDateTime(e.at))}
                {e.note && <span className="text-foreground"> — {e.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageSection>
  );
}
