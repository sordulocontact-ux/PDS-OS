import { ContractValueRows } from "@/components/legal/contracts/contract-value-rows";
import { DocumentCard } from "@/components/ui/document-card";
import { Button } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import { isBlocking } from "@/lib/legal/contracts/completeness";
import type { ContractCardData } from "@/lib/legal/contracts/document-card";
import { fileNamePart } from "@/lib/utils/file-name-part";
import type { ValueFix } from "@/lib/legal/contracts/fix";
import type { WriteResult } from "@/lib/utils/write-result";
import type {
  AgreementField,
  AgreementRow,
} from "@/lib/legal/contracts/mapping";

const fr = { legalDocuments };

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
 * source, fixed where it lives. The same card at every step that follows —
 * and before it is generated (`data` null: the file to come, how many
 * values still block, no PDF; Sacha, 06/11/2026: « pourquoi le contrat
 * ressemble pas à ça »), where the fee is changed on its line (`fee`).
 */
export function ContractDocumentCard({
  row,
  data,
  projectTitle,
  fix,
  fee,
}: {
  row: AgreementRow;
  // Null before generation.
  data: ContractCardData | null;
  projectTitle: string;
  fix?: (field: AgreementField) => ValueFix;
  fee?: { value: string; onSave: (value: string) => Promise<WriteResult> };
}) {
  const contractId = row.contract?.id ?? null;
  const blocking = row.fields.filter((f) => isBlocking(f.status)).length;
  const name = contractFileName(row.name, projectTitle, data?.version ?? 1);
  return (
    <DocumentCard
      name={name}
      line={
        data
          ? t.generated(blocking, row.fields.length)
          : t.toGenerate(blocking, row.fields.length)
      }
      // « Voir le PDF » in a new tab: the démarche stays (Sacha, 06/11/2026);
      // the contract's page in the Contrats module, second (JUR-17).
      action={
        data &&
        contractId && (
          <span className="flex flex-wrap items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a
                  href={routes.contractDocumentView(contractId)}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              {t.view}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<ViewLink href={routes.contract(contractId)} />}
            >
              {t.contractPage}
            </Button>
          </span>
        )
      }
      change={
        data &&
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
      <ContractValueRows
        fields={row.fields}
        personName={row.name}
        fix={fix}
        fee={fee}
        className="rounded-none border-0"
      />
    </DocumentCard>
  );
}
