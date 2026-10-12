"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { reviewAudioVersion } from "@/lib/catalog/master/audio-actions";
import { fr } from "@/lib/i18n/fr";

/**
 * « Valider cette version » (confirmed: a decision is never taken back) and
 * « Demander des corrections » (what to change, kept on the version), on a
 * version waiting for a decision. Shown to whoever writes the title.
 */
export function AudioReviewButtons({
  masterId,
  fileId,
  label,
  final,
}: {
  masterId: string;
  fileId: string;
  // « Mix V2 ».
  label: string;
  // A Master final: validating it finalises the title.
  final: boolean;
}) {
  const t = fr.masterPage.audio.versions;
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmButton
        label={t.approve}
        variant="default"
        title={t.approveTitle(label)}
        body={final ? t.approveFinalBody : t.approveBody}
        confirmLabel={t.approve}
        pendingLabel={fr.dialogs.saving}
        done={t.approved}
        run={() =>
          reviewAudioVersion({
            masterId,
            fileId,
            decision: "approved",
            note: "",
          })
        }
      />
      <DialogButton
        label={t.requestChanges}
        title={t.requestChangesTitle(label)}
        description={t.requestChangesHint}
      >
        {(close) => (
          <ReasonForm
            label={t.requestChangesLabel}
            submitLabel={t.requestChanges}
            doneMessage={t.changesRequested}
            run={(note) =>
              reviewAudioVersion({
                masterId,
                fileId,
                decision: "changes_requested",
                note,
              })
            }
            onDone={close}
          />
        )}
      </DialogButton>
    </div>
  );
}
