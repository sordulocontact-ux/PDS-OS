import Link from "next/link";
import { notFound } from "next/navigation";

import { FileLibrary } from "@/components/catalog/files/file-library";
import { ContractDocumentSection } from "@/components/contracts/contract-document-section";
import { ContractInfo } from "@/components/contracts/contract-info";
import { ContractJournal } from "@/components/contracts/contract-journal";
import { ContractParties } from "@/components/contracts/contract-parties";
import { ContractStateBadge } from "@/components/contracts/contract-state-badge";
import { EditContractButton } from "@/components/contracts/edit-contract-button";
import { ContractNow } from "@/components/contracts/now/contract-now";
import { BackLink } from "@/components/shell/back-link";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { PageSection } from "@/components/shell/page-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fileViewOf } from "@/lib/catalog/file-rules";
import { loadContractPage } from "@/lib/contracts/page-data";
import { findContract } from "@/lib/contracts/queries";
import { fr } from "@/lib/i18n/fr";

export const metadata = { title: `${fr.contracts.title} · ${fr.app.name}` };

/**
 * One contract (proto « Contrats », 29/10/2026): its state beside the
 * title, where it comes from in the Juridique, « Maintenant » for whoever
 * looks, then the document in head, its parties and what was already done;
 * its information on the right; its files below.
 */
export default async function ContractPage({
  params,
  searchParams,
}: PageProps<"/app/contracts/[contractId]">) {
  const access = await requireApproved();
  const [{ contractId }, query] = await Promise.all([params, searchParams]);
  const contract = await findContract(contractId);
  if (!contract) notFound();

  const data = await loadContractPage(contract, access);
  const { origin, document, signer, proof } = data;
  const t = fr.contracts;
  const p = t.page;

  return (
    <PageContainer>
      <BackLink href={routes.contracts}>{p.back}</BackLink>
      <PageHeader
        title={contract.title}
        badge={<ContractStateBadge state={contract.state} size="md" />}
        description={[t.types[contract.type], contract.parties.join(", ")]
          .filter(Boolean)
          .join(" · ")}
        action={
          contract.can.edit && <EditContractButton contractId={contract.id} />
        }
      />
      {origin && (
        // Where it comes from in the Juridique, and the way back (JUR-17).
        <ToneCallout
          tone="info"
          contentClassName="flex flex-wrap items-center justify-between gap-3"
        >
          <span>
            {origin.kind === "agreement"
              ? p.legalOrigin.agreement(contract.projectTitle ?? "")
              : p.legalOrigin.clearance(origin.element)}
          </span>
          <Link href={origin.href} className="underline underline-offset-4">
            {origin.kind === "agreement"
              ? p.legalOrigin.backToPlan
              : p.legalOrigin.backToClearance}
          </Link>
        </ToneCallout>
      )}
      <ContractNow contract={contract} data={data} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {document && (
            <ContractDocumentSection
              contractId={contract.id}
              title={contract.title}
              document={document}
              card={data.card}
              signedBy={proof?.deposit ? (signer?.name ?? null) : null}
              canRevise={
                contract.can.edit &&
                (contract.state === "draft" || contract.state === "approved")
              }
            />
          )}
          <ContractParties
            contractId={contract.id}
            parties={contract.partyList}
            signerId={signer?.contactId ?? null}
            canEdit={contract.can.edit}
          />
          <ContractJournal events={data.journal} />
        </div>
        <ContractInfo contract={contract} />
      </div>
      {/* Full width: the library's tabs and its button need the room. */}
      <PageSection
        id="contract-files"
        title={p.filesTitle}
        description={p.filesDescription}
      >
        <FileLibrary
          owner={{ kind: "contract", id: contract.id }}
          organizationId={contract.can.edit ? contract.organizationId : null}
          canReadContracts
          files={data.library.files}
          view={fileViewOf("contract", true, query.category)}
          basePath={routes.contract(contract.id)}
          emptyBody={p.filesEmpty}
          emptyBodyReadOnly={p.filesEmptyReadOnly}
        />
      </PageSection>
    </PageContainer>
  );
}
