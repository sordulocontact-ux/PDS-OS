import Link from "next/link";
import { notFound } from "next/navigation";

import { FileLibrary } from "@/components/catalog/files/file-library";
import { ContractFlow } from "@/components/contracts/contract-flow";
import { ContractParties } from "@/components/contracts/contract-parties";
import { EditContractButton } from "@/components/contracts/edit-contract-button";
import { BackLink } from "@/components/shell/back-link";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fileViewOf } from "@/lib/catalog/file-rules";
import { listCatalogFiles } from "@/lib/catalog/files";
import { getContract, listPartyCandidates } from "@/lib/contracts/queries";
import { todayInParis } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { formatDate, formatDateTime } from "@/lib/release/format";

export const metadata = { title: `${fr.contracts.title} · ${fr.app.name}` };

const linkClass =
  "underline-offset-4 hover:underline focus-visible:underline outline-none";

/**
 * One contract: what it is, where it stands (validation, signature), who it
 * binds (network contacts) and its versioned files.
 */
export default async function ContractPage({
  params,
  searchParams,
}: PageProps<"/app/contracts/[contractId]">) {
  const access = await requireApproved();
  const [{ contractId }, query] = await Promise.all([params, searchParams]);
  const contract = await getContract(contractId, access);
  if (!contract) notFound();

  const owner = { kind: "contract" as const, id: contract.id };
  const [candidates, library] = await Promise.all([
    contract.can.edit
      ? listPartyCandidates(contract.partyList.map((p) => p.contactId))
      : [],
    listCatalogFiles(owner),
  ]);
  const t = fr.contracts;
  const p = t.page;
  const today = todayInParis(new Date());
  const period = p.periodValue(
    contract.startsOn && formatDate(contract.startsOn),
    contract.endsOn && formatDate(contract.endsOn),
  );

  return (
    <PageContainer>
      <BackLink href={routes.contracts}>{p.back}</BackLink>
      <PageHeader
        title={contract.title}
        description={[t.types[contract.type], contract.parties.join(", ")]
          .filter(Boolean)
          .join(" · ")}
        action={
          contract.can.edit && <EditContractButton contractId={contract.id} />
        }
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <ContractFlow
            contractId={contract.id}
            state={contract.state}
            can={contract.can}
            today={today}
            lastReview={
              contract.reviewerName && contract.reviewedAt
                ? {
                    comment: contract.reviewComment,
                    label: t.flow.lastReview(
                      contract.reviewerName,
                      formatDateTime(contract.reviewedAt),
                    ),
                  }
                : null
            }
          />
          <ContractParties
            contractId={contract.id}
            parties={contract.partyList}
            candidates={candidates}
            canEdit={contract.can.edit}
          />
        </div>
        <FactList
          emptyLabel={p.none}
          facts={[
            { label: p.type, value: t.types[contract.type] },
            { label: p.owner, value: contract.ownerName || null },
            {
              label: p.project,
              value: contract.projectId && contract.projectTitle && (
                <Link
                  href={routes.project(contract.projectId)}
                  className={linkClass}
                >
                  {contract.projectTitle}
                </Link>
              ),
            },
            {
              label: p.artist,
              value: contract.artistId && contract.artistName && (
                <Link
                  href={routes.artist(contract.artistId)}
                  className={linkClass}
                >
                  {contract.artistName}
                </Link>
              ),
            },
            {
              label: p.dueOn,
              value: contract.dueOn && formatDate(contract.dueOn),
            },
            { label: p.period, value: period || null },
            {
              label: p.signedOn,
              value: contract.signedOn && formatDate(contract.signedOn),
            },
            { label: p.notes, value: contract.notes },
          ]}
        />
      </div>
      {/* Full width: the library's tabs and its button need the room. */}
      <PageSection
        id="contract-files"
        title={p.filesTitle}
        description={p.filesDescription}
      >
        <FileLibrary
          owner={owner}
          organizationId={contract.can.edit ? contract.organizationId : null}
          canReadContracts
          files={library.files}
          view={fileViewOf("contract", true, query.category)}
          basePath={routes.contract(contract.id)}
          emptyBody={p.filesEmpty}
          emptyBodyReadOnly={p.filesEmptyReadOnly}
        />
      </PageSection>
    </PageContainer>
  );
}
