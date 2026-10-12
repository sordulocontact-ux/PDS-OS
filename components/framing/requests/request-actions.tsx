"use client";

import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import {
  resolveBriefRequest,
  withdrawBriefRequest,
} from "@/lib/framing/actions/brief-requests";
import { fr } from "@/lib/i18n/fr";

/**
 * The owner's answer to a request: « Marquer comme corrigée » when the
 * latest version changed what it points at (a note is optional), otherwise
 * « Justifier sans modifier » with a reason (the database checks again).
 */
export function ResolveRequestButton({
  projectId,
  requestId,
  changed,
}: {
  projectId: string;
  requestId: string;
  changed: boolean;
}) {
  const t = fr.briefRequests;
  return (
    <DialogButton
      label={changed ? t.resolve : t.justify}
      variant={changed ? "default" : "outline"}
      size="sm"
      title={changed ? t.resolveTitle : t.justifyTitle}
      description={changed ? t.resolveBody : t.justifyBody}
    >
      {(close) => (
        <ReasonForm
          label={changed ? t.noteLabel : t.justificationLabel}
          required={!changed}
          submitLabel={changed ? t.resolve : t.justify}
          doneMessage={changed ? t.resolved : t.justified}
          run={(note) => resolveBriefRequest(projectId, requestId, note)}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

/** The validator withdraws a request, with a reason kept in the history. */
export function WithdrawRequestButton({
  projectId,
  requestId,
}: {
  projectId: string;
  requestId: string;
}) {
  const t = fr.briefRequests;
  return (
    <DialogButton
      label={t.withdraw}
      variant="ghost"
      size="sm"
      title={t.withdrawTitle}
      description={t.withdrawBody}
    >
      {(close) => (
        <ReasonForm
          label={t.withdrawLabel}
          submitLabel={t.withdraw}
          doneMessage={t.withdrawn}
          run={(reason) => withdrawBriefRequest(projectId, requestId, reason)}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
