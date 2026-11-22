"use client";

import {
  DealContractCreate,
  type DealContractDefaults,
} from "@/components/deals/deal-contract-create";
import { DealContractDeposit } from "@/components/deals/deal-contract-deposit";
import { nowHeading, nowSecondary } from "@/components/deals/now-classes";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";

const t = dealMemos.contract.now;

/** What « Maintenant » needs of the deal's contract before its circuit. */
export type ContractStep = {
  // The contract linked, without its document yet.
  contract: { id: string } | null;
  // The participation's contract, launched by the project's owner.
  participation: boolean;
  // « Créer le contrat », for whoever creates contracts.
  create: DealContractDefaults | null;
  organizationId: string;
};

/**
 * The contracting's first gestures in « Maintenant » (Sacha 22/11/2026: « je
 * voudrais pouvoir tout faire depuis la page du deal »): no contract yet →
 * « Créer le contrat » (linked to the deal at once); a contract without its
 * document → « Déposer le contrat », its PDF. Once the document is there,
 * the contract's own « Maintenant » takes over on the deal (ContractNow:
 * send to validate, validate, send for signature, mark signed). A
 * participation's contract is the project owner's: said, nothing to do here.
 */
export function DealContractNow({
  dealId,
  step,
}: {
  dealId: string;
  step: ContractStep;
}) {
  if (step.participation && !step.contract)
    return <p className={nowSecondary}>{t.participation}</p>;
  if (step.contract)
    return (
      <>
        <h2 className={nowHeading}>{t.deposit}</h2>
        {step.create && (
          <div>
            <DealContractDeposit
              organizationId={step.organizationId}
              contractId={step.contract.id}
              size="lg"
            />
          </div>
        )}
      </>
    );
  return (
    <>
      <h2 className={nowHeading}>{t.create}</h2>
      {step.create && (
        <div>
          <DealContractCreate
            dealId={dealId}
            defaults={step.create}
            variant="default"
            size="lg"
          />
        </div>
      )}
    </>
  );
}
