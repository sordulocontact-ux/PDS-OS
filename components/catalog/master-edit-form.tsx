"use client";

import dynamic from "next/dynamic";
import { toast } from "sonner";

import { EditPanel } from "@/components/archive/edit-panel";
import { loadMasterEdit } from "@/lib/catalog/edit-form-actions";
import { fr } from "@/lib/i18n/fr";

const CreateMasterForm = dynamic(() =>
  import("@/components/catalog/create-master-form").then(
    (m) => m.CreateMasterForm,
  ),
);

/** Body of "Modifier" for a title (credits, ISRC…): its data read when the
 * modal opens, the creation form in edit mode. Title list and Juridique. */
export function MasterEditForm({
  masterId,
  onSaved,
  onCancel,
}: {
  masterId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  return (
    <EditPanel load={() => loadMasterEdit(masterId)}>
      {(data) => (
        <CreateMasterForm
          artists={data.artists}
          defaults={data.defaults}
          defaultCredits={data.master.credits}
          masterId={masterId}
          onCreated={() => {
            onSaved();
            toast.success(fr.records.edit.saved);
          }}
          onCancel={onCancel}
        />
      )}
    </EditPanel>
  );
}
