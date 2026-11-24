"use client";

import {
  DealContractCreate,
  type DealContractDefaults,
} from "@/components/deals/deal-contract-create";
import { DealContractGenerate } from "@/components/deals/deal-contract-generate";
import { DealParticipationNow } from "@/components/deals/deal-participation-now";
import { nowHeading, nowSecondary } from "@/components/deals/now-classes";
import type { ParticipationStep } from "@/lib/deals/participation-types";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";

const t = dealMemos.contract.now;

/** What « Maintenant » needs of the deal's contract before its circuit. */
export type ContractStep = {
  // The participation's contract, prepared in its project's Juridique
  // (DealParticipationNow); "unread": its state could not be read.
  participation: ParticipationStep | "unread" | null;
  // « Créer le contrat », for whoever creates contracts.
  create: DealContractDefaults | null;
};

/**
 * The contracting's first gesture in « Maintenant » (Sacha 22/11/2026: « je
 * voudrais pouvoir tout faire depuis la page du deal »): no contract yet →
 * « Générer le contrat » from a validated template filled from the deal (the
 * main gesture: PDS OS writes it), or « Importer un contrat » received. Once there, the
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
  if (step.participation === "unread")
    return <p className={nowSecondary}>{t.participation}</p>;
  if (step.participation)
    return <DealParticipationNow step={step.participation} />;
  return (
    <>
      <h2 className={nowHeading}>{t.create}</h2>
      {step.create && (
        <div className="flex flex-wrap gap-2">
          <DealContractCreate
            dealId={dealId}
            defaults={step.create}
            label={dealMemos.contract.import}
            size="lg"
          />
          <DealContractGenerate dealId={dealId} size="lg" />
        </div>
      )}
    </>
  );
}
