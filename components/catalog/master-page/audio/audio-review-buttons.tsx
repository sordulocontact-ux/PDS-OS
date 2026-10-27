"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import {
  commentsAsNote,
  type AudioComment,
} from "@/lib/catalog/audio-versions";
import { reviewAudioVersion } from "@/lib/catalog/master/audio-actions";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { dialogs, masterPage };

/**
 * The decision on a version waiting for one, in the version's row of
 * buttons: « Demander des corrections » (what to change, kept on the
 * version; the note starts from the listening notes already written) and
 * « Valider cette version » (confirmed: a decision is never taken back).
 * Shown to whoever writes the title.
 */
export function AudioReviewButtons({
  masterId,
  fileId,
  label,
  final,
  comments,
}: {
  masterId: string;
  fileId: string;
  // « Mix V2 ».
  label: string;
  // A Master final: validating it finalises the title.
  final: boolean;
  // The version's listening notes, the note's starting point.
  comments: AudioComment[];
}) {
  const t = fr.masterPage.audio.versions;
  const note = commentsAsNote(comments, t.comments.whole);
  return (
    <>
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
            defaultValue={note || undefined}
            hint={note ? t.requestChangesFromComments : undefined}
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
    </>
  );
}
