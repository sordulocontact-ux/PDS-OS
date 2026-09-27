"use client";

import dynamic from "next/dynamic";
import { toast } from "sonner";

import { EditPanel } from "@/components/archive/edit-panel";
import { RecordActions } from "@/components/archive/record-actions";
import type { RecordRights } from "@/lib/archive/types";
import { loadMasterEdit } from "@/lib/catalog/edit-form-actions";
import { fr } from "@/lib/i18n/fr";

const CreateMasterForm = dynamic(() =>
  import("@/components/catalog/create-master-form").then(
    (m) => m.CreateMasterForm,
  ),
);

/** "⋯" of a master: edit it (credits included), archive or restore it. */
export function MasterActions({
  master,
  rights,
  leaveTo,
  size,
}: {
  master: { id: string; title: string; projectCount: number };
  rights: RecordRights;
  leaveTo?: string;
  size?: "icon-sm" | "icon-lg";
}) {
  return (
    <RecordActions
      kind="master"
      id={master.id}
      name={master.title}
      rights={rights}
      leaveTo={leaveTo}
      size={size}
      blockedReason={
        master.projectCount > 0
          ? fr.records.archive.blocked.masterHasProjects(master.projectCount)
          : undefined
      }
      edit={(close) => (
        <EditPanel load={() => loadMasterEdit(master.id)}>
          {(data) => (
            <CreateMasterForm
              artists={data.artists}
              defaults={data.defaults}
              defaultCredits={data.master.credits}
              masterId={master.id}
              onCreated={() => {
                close();
                toast.success(fr.records.edit.saved);
              }}
              onCancel={close}
            />
          )}
        </EditPanel>
      )}
    />
  );
}
