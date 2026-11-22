"use client";

import Link from "next/link";

import {
  DealContractCreate,
  type DealContractDefaults,
} from "@/components/deals/deal-contract-create";
import { nowHeading, nowSecondary } from "@/components/deals/now-classes";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";

const t = dealMemos.contract.now;

/** What « Maintenant » needs of the deal's contract while contracting. */
export type ContractStep = {
  contract: { id: string; visible: boolean } | null;
  // The participation's contract, launched by the project's owner.
  participation: boolean;
  // « Créer le contrat », for whoever creates contracts.
  create: DealContractDefaults | null;
};

/**
 * The contracting's gesture in « Maintenant » (Sacha 22/11/2026: « même pas
 * la carte maintenant, créer le contrat »): no contract yet → « Créer le
 * contrat », the main button (linked to the deal at once); a contract →
 * « Faire signer le contrat », opened in Contrats; the deal is « Signé » by
 * itself once it is marked signed there. A participation's contract is the
 * project owner's: said, nothing to do here.
 */
export function DealContractNow({
  dealId,
  step,
}: {
  dealId: string;
  step: ContractStep;
}) {
  if (step.contract)
    return (
      <>
        <h2 className={nowHeading}>{t.sign}</h2>
        {step.contract.visible && (
          <div>
            <Button
              nativeButton={false}
              render={<Link href={routes.contract(step.contract.id)} />}
            >
              {t.open}
            </Button>
          </div>
        )}
      </>
    );
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
