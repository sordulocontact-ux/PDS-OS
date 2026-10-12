"use client";

import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { fr } from "@/lib/i18n/fr";
import { declareMixFinal } from "@/lib/master-workflow/mix-actions";

/** « Utiliser ce mix comme mix final », confirmed in a dialog: definitive,
 * the mastering starts from this very file (PROJ-BUG-06). */
export function DeclareMixFinalButton({
  projectId,
  masterId,
  file,
  title,
}: {
  projectId: string;
  masterId: string;
  file: { id: string; fileName: string };
  title: string;
}) {
  const t = fr.masterWorkflow.diagnosis;
  return (
    <DialogButton
      label={t.declare}
      size="sm"
      title={t.declareTitle(title)}
      description={t.declareBody(file.fileName)}
    >
      {(close) => (
        <ReasonForm
          label={t.declareNote}
          required={false}
          submitLabel={t.declare}
          doneMessage={t.declared}
          run={(note) => declareMixFinal(projectId, masterId, file.id, note)}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
