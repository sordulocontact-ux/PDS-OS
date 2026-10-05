"use client";

import { RecordActions } from "@/components/archive/record-actions";
import { MasterEditForm } from "@/components/catalog/master-edit-form";
import type { RecordRights } from "@/lib/archive/types";
import { fr } from "@/lib/i18n/fr";

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
        <MasterEditForm masterId={master.id} onSaved={close} onCancel={close} />
      )}
    />
  );
}
