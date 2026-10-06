"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { ContractForm } from "@/components/contracts/contract-form";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { loadContractOptions } from "@/lib/contracts/actions";
import { fr } from "@/lib/i18n/fr";

/** "Nouveau contrat": the form in the modal; once created, its page opens
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
      title={t.createTitle}
      description={t.createDescription}
      closeLabel={t.close}
      load={loadContractOptions}
    >
      {(options, close) => (
        <ContractForm
          options={options}
          initial={projectId ? { projectId } : undefined}
          onCancel={close}
          // The server action opens the new page itself.
          onSaved={close}
        />
      )}
    </LoadedFormButton>
  );
}
