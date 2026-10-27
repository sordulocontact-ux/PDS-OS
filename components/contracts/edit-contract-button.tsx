"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { ContractForm } from "@/components/contracts/contract-form";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { loadContractEdit } from "@/lib/contracts/actions";
import { fr } from "@/lib/i18n/fr";

/** "Modifier" of a contract page: its real form, read when it opens. */
export function EditContractButton({ contractId }: { contractId: string }) {
  const t = fr.contracts.form;
  return (
    <LoadedFormButton
      label={fr.contracts.page.edit}
      icon={IconPenWriting2}
      variant="outline"
      title={t.editTitle}
      description={t.editDescription}
      closeLabel={t.close}
      load={() => loadContractEdit(contractId)}
    >
      {(data, close) =>
        data ? (
          <ContractForm
            contract={data.contract}
            options={data.options}
            onCancel={close}
            onSaved={() => {
              close();
              toast.success(t.saved);
            }}
          />
        ) : (
          <FormMessage kind="error">{fr.records.errors.not_found}</FormMessage>
        )
      }
    </LoadedFormButton>
  );
}
