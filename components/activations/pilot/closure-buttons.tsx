"use client";

import { DialogButton } from "@/components/ui/dialog-button";
import { reopenActivation } from "@/lib/activations/actions";
import { fr } from "@/lib/i18n/fr";

import { ReasonForm } from "@/components/ui/reason-form";
import { ClosureForm } from "./closure-form";

const t = fr.activations.closure;

export function CloseActivationButton(props: {
  projectId: string;
  activationId: string;
  reserves: { key: string; count?: number; label: string }[];
}) {
  return (
    <DialogButton
      label={t.close}
      variant="default"
      title={t.closeTitle}
      description={t.closeDescription}
    >
      {(close) => <ClosureForm {...props} onDone={close} />}
    </DialogButton>
  );
}

export function ReopenActivationButton({
  projectId,
  activationId,
}: {
  projectId: string;
  activationId: string;
}) {
  return (
    <DialogButton
      label={t.reopen}
      title={t.reopenTitle}
      description={t.reopenDescription}
    >
      {(close) => (
        <ReasonForm
          label={t.reopenReason}
          submitLabel={t.reopen}
          doneMessage={t.reopened}
          run={(reason) =>
            reopenActivation({ projectId, activationId, reason })
          }
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
