"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { ContractForm } from "@/components/contracts/contract-form";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { loadContractOptions } from "@/lib/contracts/actions";
import type { ContractType } from "@/lib/contracts/types";
import { linkDealContract } from "@/lib/deals/memo-actions";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const t = dealMemos.contract;

/** What the new contract already knows from the deal. */
export type DealContractDefaults = {
  title: string;
  type: ContractType;
  artistId: string | null;
  projectId: string | null;
};

/**
 * « Créer le contrat » from the deal (Sacha 22/11/2026: « je vois aucun
 * bouton »): the contract form of Contrats, filled from the deal (its name,
 * a licence or a partnership, its artist and project), then the new contract
 * is the deal's at once; its parties and files are added on its page in
 * Contrats. For whoever creates contracts (manage_contracts).
 */
export function DealContractCreate({
  dealId,
  defaults,
  variant = "outline",
  size = "sm",
}: {
  dealId: string;
  defaults: DealContractDefaults;
  // `default`/`lg`: the main gesture of « Maintenant ».
  variant?: "default" | "outline";
  size?: "lg" | "sm";
}) {
  const link = useWriteSubmit(undefined, t.created);
  return (
    <LoadedFormButton
      label={t.create}
      icon={IconPlus}
      variant={variant}
      size={size}
      title={t.createTitle}
      description={t.createDescription}
      closeLabel={dialogs.close}
      load={loadContractOptions}
    >
      {(options, close) => (
        <ContractForm
          options={options}
          stay
          initial={{
            title: defaults.title,
            type: defaults.type,
            artistId: defaults.artistId,
            projectId: defaults.projectId,
          }}
          onCancel={close}
          onSaved={(id) => {
            close();
            link.run(() => linkDealContract(dealId, id));
          }}
        />
      )}
    </LoadedFormButton>
  );
}
