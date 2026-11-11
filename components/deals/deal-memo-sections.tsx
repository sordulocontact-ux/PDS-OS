import { DealContract } from "@/components/deals/deal-contract";
import { DealMemoCompare } from "@/components/deals/deal-memo-compare";
import { DealMemos } from "@/components/deals/deal-memos";
import { PageSection } from "@/components/shell/page-section";
import { can, type Access } from "@/lib/auth/access";
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
 * and its versions, then the contract and, once a memo is validated and a
 * contract linked, the comparison term by term.
 */
export async function DealMemoSections({
  access,
  deal,
  terms,
}: {
  access: Access;
  deal: Deal;
  terms: DealTerm[];
}) {
  const [memos, contract, options] = await Promise.all([
    loadDealMemos(deal.id, deal.kind),
    loadDealContract(deal.id),
    deal.canWrite && !deal.participationId
      ? loadDealContractOptions(deal.id)
      : Promise.resolve(null),
  ]);
  const validated = memos.find((m) => m.status === "validated") ?? null;
  const checks =
    validated && contract
      ? await loadMemoChecks(validated.id, contract.id)
      : [];
  // Checks go on while contracting and once signed, never on an abandoned deal.
  const canCheck =
    deal.stage !== "abandoned" &&
    (can(access, "validate") ||
      (deal.assignee?.id === access.personId && can(access, "negotiate")));

  return (
    <>
      <PageSection id="deal-memo" title={dealMemos.section}>
        <DealMemos
          dealId={deal.id}
          dealName={dealName(deal)}
          memos={memos}
          changed={memos[0] ? changedSince(memos[0], terms) : false}
          canWrite={deal.canWrite}
          canValidate={can(access, "validate") && !isClosedStage(deal.stage)}
        />
      </PageSection>
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
    </>
  );
}
