"use client";

import { DialogButton } from "@/components/ui/dialog-button";
import type { ActivationSummary } from "@/lib/activations/types";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";

import { ActivationForm } from "../activation-form";
import { StatusForm } from "./status-form";

const t = fr.activations;

/** « Changer le statut » and « Modifier » of an activation's page. */
export function IdentityActions({
  activation,
  members,
}: {
  activation: ActivationSummary;
  members: Member[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <DialogButton
        label={t.status.change}
        variant="default"
        title={t.status.title}
        description={t.status.declaredWarning}
      >
        {(close) => (
          <StatusForm
            projectId={activation.projectId}
            activationId={activation.id}
            current={activation.status}
            reason={activation.statusReason}
            gaps={activation.launchGaps}
            onDone={close}
          />
        )}
      </DialogButton>
      <DialogButton
        label={t.identity.edit}
        title={t.identity.editTitle}
        description={t.identity.editDescription}
        wide
      >
        {(close) => (
          <ActivationForm
            projectId={activation.projectId}
            members={members}
            activation={activation}
            onDone={close}
          />
        )}
      </DialogButton>
    </div>
  );
}
