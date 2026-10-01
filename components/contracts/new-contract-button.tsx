"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { ContractForm } from "@/components/contracts/contract-form";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { loadContractOptions } from "@/lib/contracts/actions";
import { fr } from "@/lib/i18n/fr";

/** "Nouveau contrat": the form in the modal; once created, its page opens
 * (redirected by the server action). */
export function NewContractButton() {
  const t = fr.contracts.form;
  return (
    <LoadedFormButton
      label={fr.contracts.new}
      icon={IconPlus}
      title={t.createTitle}
      description={t.createDescription}
      closeLabel={t.close}
      load={loadContractOptions}
    >
      {(options, close) => (
        <ContractForm
          options={options}
          onCancel={close}
          // The server action opens the new page itself.
          onSaved={close}
        />
      )}
    </LoadedFormButton>
  );
}
