"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { ContractCreation } from "@/components/contracts/contract-creation";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { loadContractOptions } from "@/lib/contracts/actions";
import { contracts } from "@/lib/i18n/fr/contracts";

const fr = { contracts };

/** "Nouveau contrat": what is being made first (ContractCreation, JUR-18),
 * then the form in the modal; once created, its page opens
 * (redirected by the server action), where its parties and files are added.
 * `projectId`: from a project's section (Juridique), attached to it and as
 * small as the section's other buttons. */
export function NewContractButton({ projectId }: { projectId?: string } = {}) {
  const t = fr.contracts.form;
  return (
    <LoadedFormButton
      label={fr.contracts.new}
      icon={IconPlus}
      variant={projectId ? "outline" : "default"}
      size={projectId ? "sm" : "lg"}
      // Wide: « Créer un modèle réutilisable » writes the contract on its page.
      dialogSize="wide"
      title={t.createTitle}
      description={t.createDescription}
      closeLabel={t.close}
      load={loadContractOptions}
    >
      {(options, close) => (
        <ContractCreation
          options={options}
          projectId={projectId}
          onClose={close}
        />
      )}
    </LoadedFormButton>
  );
}
