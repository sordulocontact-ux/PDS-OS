"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { EditPanel } from "@/components/archive/edit-panel";
import { ContractForm } from "@/components/contracts/contract-form";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions } from "@/components/ui/row-actions";
import { loadContractEdit } from "@/lib/contracts/actions";
import { contracts } from "@/lib/i18n/fr/contracts";
import { records } from "@/lib/i18n/fr/records";

const fr = { contracts, records };

/**
 * « ⋯ » of a contract on its row in the list: « Modifier », the same form as
 * the contract page's button (`EditContractButton`), for whoever may edit it.
 * A contract has no archive or delete: its page offers none.
 */
export function ContractRowActions({
  contract,
  reveal = false,
}: {
  contract: { id: string; title: string; canEdit: boolean };
  reveal?: boolean;
}) {
  const t = fr.contracts.form;
  const [editing, setEditing] = useState(false);
  if (!contract.canEdit) return null;
  return (
    <>
      <RowActions
        label={fr.records.menu.label(contract.title)}
        reveal={reveal}
        actions={[
          {
            key: "edit",
            label: fr.contracts.page.edit,
            icon: IconPenWriting2,
            onSelect: () => setEditing(true),
          },
        ]}
      />
      <FormDialog
        open={editing}
        onOpenChange={setEditing}
        title={t.editTitle}
        description={t.editDescription}
        closeLabel={t.close}
      >
        <EditPanel load={() => loadContractEdit(contract.id)}>
          {(data) => (
            <ContractForm
              contract={data.contract}
              options={data.options}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                toast.success(t.saved);
              }}
            />
          )}
        </EditPanel>
      </FormDialog>
    </>
  );
}
