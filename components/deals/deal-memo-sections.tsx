import { DealContract } from "@/components/deals/deal-contract";
import { DealMemoCompare } from "@/components/deals/deal-memo-compare";
import {
  DealMemoLoop,
  DealMemoLoopAdd,
} from "@/components/deals/deal-memo-loop";
import { DealMemos, NewDealMemoButton } from "@/components/deals/deal-memos";
import { PageSection } from "@/components/shell/page-section";
import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { listCatalogFiles } from "@/lib/catalog/files";
import { getContractDocument } from "@/lib/legal/contracts/document";
import { loadDealContacts } from "@/lib/deals/contact-queries";
import {
  dealMailSetup,
  loadDealLoop,
  loadLoopMemberOptions,
  memoReplyTo,
} from "@/lib/deals/memo-mail-queries";
import {
  loadDealContract,
  loadDealContractOptions,
  loadDealMemos,
  loadMemoChecks,
} from "@/lib/deals/memo-queries";
import { changedSince, compareMemo } from "@/lib/deals/memos";
import { dealContractDefaults } from "@/lib/deals/contract-defaults";
import { dealName } from "@/lib/deals/names";
import type { DealTerm } from "@/lib/deals/terms";
import { isClosedStage, type Deal } from "@/lib/deals/types";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";

/**
 * The deal memo and the contract of a deal's page (BIZ 7): the latest memo
 * and its versions with their circuit by e-mail (received, shown to the
 * direction, validated or sent back for changes, the agreement sent back),
 * the people in the loop, then the contract and, once a memo is validated
 * and a contract linked, the comparison term by term. `readOnly`: the
 * deal's « Dossier », read without its gestures (they are in « À faire »).
 * `part`: the memo, the loop or the contract alone, so that « À faire »
 * orders them (Sacha 22/11/2026: the terms matter more than an empty loop
 * and contract; the loop beside the next action).
 */
export async function DealMemoSections({
  access,
  deal,
  terms,
  readOnly = false,
  part = "all",
}: {
  access: Access;
  deal: Deal;
  terms: DealTerm[];
  readOnly?: boolean;
  part?: "all" | "memo" | "loop" | "contract";
}) {
  const canWrite = deal.canWrite && !readOnly;
  const [memos, contract, options, loop, members, contacts] = await Promise.all(
    [
      loadDealMemos(deal.id, deal.kind, true),
      loadDealContract(deal.id),
      canWrite && !deal.participationId
        ? loadDealContractOptions(deal.id)
        : Promise.resolve(null),
      loadDealLoop(deal.id),
      canWrite ? loadLoopMemberOptions(deal.id) : Promise.resolve({}),
      canWrite ? loadDealContacts(deal.id) : Promise.resolve([]),
    ],
  );
  const memoPart = part === "all" || part === "memo";
  const loopPart = part === "all" || part === "loop";
  const contractPart = part === "all" || part === "contract";
  // The contract's PDF: its latest signed copy, else its latest draft.
  const contractFiles =
    contractPart && contract?.visible
      ? (await listCatalogFiles({ kind: "contract", id: contract.id })).files
      : [];
  const pick = (category: string) =>
    contractFiles.find((f) => f.category === category) ?? null;
  const latestFile = pick("signed") ?? pick("pds_signed") ?? pick("draft");
  // Written by PDS OS from a template (the memo's terms): its document.
  const written =
    contractPart && contract?.visible
      ? (await getContractDocument(contract.id)) !== null
      : false;
  // No file yet: the document, printed on demand.
  const generated = written && !latestFile;
  const contractFile = latestFile
    ? { name: latestFile.fileName, openUrl: latestFile.openUrl }
    : generated && contract
      ? {
          name: contract.title,
          openUrl: null,
          pdfHref: routes.contractDocumentPdf(contract.id),
        }
      : null;
  const mail = dealMailSetup(deal.id);
  const latestFrom = memos.find((m) => m.email)?.email?.from ?? null;
  const replyTo =
    canWrite && memos[0]?.status === "validated" && !memos[0].sent
      ? await memoReplyTo(latestFrom, deal.counterpartId)
      : null;
  const validated = memos.find((m) => m.status === "validated") ?? null;
  const checks =
    validated && contract
      ? await loadMemoChecks(validated.id, contract.id)
      : [];
  // Checks go on while contracting and once signed, never on an abandoned deal.
  const canCheck =
    !readOnly &&
    deal.stage !== "abandoned" &&
    (can(access, "validate") ||
      (deal.assignee?.id === access.personId && can(access, "negotiate")));

  return (
    <>
      {memoPart && (
        <PageSection
          id="deal-memo"
          title={dealMemos.section}
          action={
            canWrite &&
            !isClosedStage(deal.stage) && <NewDealMemoButton dealId={deal.id} />
          }
        >
          <DealMemos
            dealId={deal.id}
            dealName={dealName(deal)}
            memos={memos}
            changed={memos[0] ? changedSince(memos[0], terms) : false}
            canWrite={canWrite}
            canValidate={
              !readOnly && can(access, "validate") && !isClosedStage(deal.stage)
            }
            send={{
              replyTo,
              copies: loop
                .filter((e) => e.kind === "contact" && e.email)
                .flatMap((e) => (e.email ? [e.email] : [])),
              canEmail: mail.canEmail,
              atAccord: deal.stage === "agreement",
            }}
            organizationId={access.organizationId}
          />
        </PageSection>
      )}
      {loopPart && (canWrite || loop.length > 0) && (
        <PageSection
          id="boucle"
          title={dealMemos.loop.section}
          action={
            canWrite &&
            !isClosedStage(deal.stage) && (
              <DealMemoLoopAdd
                dealId={deal.id}
                members={members}
                linked={[
                  ...contacts.map((c) => c.id),
                  ...(deal.counterpartId ? [deal.counterpartId] : []),
                ]}
              />
            )
          }
        >
          <DealMemoLoop
            dealId={deal.id}
            entries={loop}
            canWrite={canWrite && !isClosedStage(deal.stage)}
          />
        </PageSection>
      )}
      {contractPart && (
        <PageSection id="contrat" title={dealMemos.contract.section}>
          <div className="flex flex-col gap-6">
            <DealContract
              dealId={deal.id}
              participation={deal.participationId !== null}
              contract={contract}
              options={options}
              // Contracting, « Maintenant » holds « Importer » and « Générer »
              // (DealContractNow): never twice (Sacha 23/11/2026).
              create={
                canWrite &&
                can(access, "manage_contracts") &&
                deal.stage !== "contracting"
                  ? dealContractDefaults(deal, access.organizationId)
                  : null
              }
              document={contractFile}
              returned={contract?.status === "sent" && pick("signed") !== null}
              deposit={
                canWrite &&
                can(access, "manage_contracts") &&
                contract?.source === "deal"
                  ? access.organizationId
                  : null
              }
            />
            {/* Written by PDS OS from the validated memo, the contract says
                the same by construction: nothing to compare (Sacha
                22/11/2026). Only a contract brought from elsewhere is. */}
            {/* Nothing to compare before a contract is there. */}
            {!written && contract && (
              <DealMemoCompare
                dealId={deal.id}
                memo={
                  validated && { id: validated.id, number: validated.number }
                }
                rows={
                  validated && contract
                    ? compareMemo(validated, contract, checks)
                    : null
                }
                canWrite={canCheck}
              />
            )}
          </div>
        </PageSection>
      )}
    </>
  );
}
