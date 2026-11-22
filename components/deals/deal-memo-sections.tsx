import { DealContract } from "@/components/deals/deal-contract";
import { DealMemoCompare } from "@/components/deals/deal-memo-compare";
import { DealMemoLoop } from "@/components/deals/deal-memo-loop";
import { DealMemos } from "@/components/deals/deal-memos";
import { PageSection } from "@/components/shell/page-section";
import { can, type Access } from "@/lib/auth/access";
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
 * `part`: the memo alone, or what follows it (the loop, the contract), so
 * that « À faire » puts the terms between them (Sacha 22/11/2026: the terms
 * matter more than an empty loop and contract).
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
  part?: "all" | "memo" | "follow";
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

  const memoPart = part !== "follow";
  const followPart = part !== "memo";
  return (
    <>
      {memoPart && (
        <PageSection id="deal-memo" title={dealMemos.section}>
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
                .map((e) => e.name),
              canEmail: mail.canEmail,
            }}
            address={mail.address}
          />
        </PageSection>
      )}
      {followPart && (canWrite || loop.length > 0) && (
        <PageSection id="boucle" title={dealMemos.loop.section}>
          <DealMemoLoop
            dealId={deal.id}
            entries={loop}
            members={members}
            linked={[
              ...contacts.map((c) => c.id),
              ...(deal.counterpartId ? [deal.counterpartId] : []),
            ]}
            canWrite={canWrite && !isClosedStage(deal.stage)}
          />
        </PageSection>
      )}
      {followPart && (
        <PageSection id="contrat" title={dealMemos.contract.section}>
          <div className="flex flex-col gap-6">
            <DealContract
              dealId={deal.id}
              participation={deal.participationId !== null}
              contract={contract}
              options={options}
            />
            <DealMemoCompare
              dealId={deal.id}
              memo={validated && { id: validated.id, number: validated.number }}
              rows={
                validated && contract
                  ? compareMemo(validated, contract, checks)
                  : null
              }
              canWrite={canCheck}
            />
          </div>
        </PageSection>
      )}
    </>
  );
}
