"use client";

import {
  DealContractCreate,
  type DealContractDefaults,
} from "@/components/deals/deal-contract-create";
import { nowHeading, nowSecondary } from "@/components/deals/now-classes";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";

const t = dealMemos.contract.now;

/** What « Maintenant » needs of the deal's contract before its circuit. */
export type ContractStep = {
  // The participation's contract, launched by the project's owner.
  participation: boolean;
  // « Créer le contrat », for whoever creates contracts.
  create: DealContractDefaults | null;
};

/**
 * The contracting's first gesture in « Maintenant » (Sacha 22/11/2026: « je
 * voudrais pouvoir tout faire depuis la page du deal »): no contract yet →
 * « Créer le contrat » (linked to the deal at once). Once there, the
 * contract's own « Maintenant » takes over on the deal (ContractNow, the
 * same as in Contrats: deposit its PDF, send to validate, validate, send for
 * signature, mark signed). A participation's contract is the project
 * owner's: said, nothing to do here.
 */
export function DealContractNow({
  dealId,
  step,
}: {
  dealId: string;
  step: ContractStep;
}) {
  if (step.participation)
    return <p className={nowSecondary}>{t.participation}</p>;
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
