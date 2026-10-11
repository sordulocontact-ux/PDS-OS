"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { DialogButton } from "@/components/ui/dialog-button";
import { resolveBlocker } from "@/lib/activations/pilot-actions";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";

import { ReasonForm } from "@/components/ui/reason-form";
import { BlockerForm } from "./blocker-form";

const t = fr.activations.blockers;

export function AddBlockerButton(props: {
  projectId: string;
  activationId: string;
  members: Member[];
}) {
  return (
    <DialogButton
      label={t.add}
      icon={IconPlus}
      title={t.addTitle}
      description={t.addDescription}
    >
      {(close) => <BlockerForm {...props} onDone={close} />}
    </DialogButton>
  );
}

export function ResolveBlockerButton({
  projectId,
  blockerId,
}: {
  projectId: string;
  blockerId: string;
}) {
  return (
    <DialogButton
      label={t.resolve}
      size="xs"
      title={t.resolveTitle}
      description={t.resolveDescription}
    >
      {(close) => (
        <ReasonForm
          label={t.resolution}
          submitLabel={t.resolve}
          doneMessage={t.resolved}
          run={(note) => resolveBlocker({ projectId, blockerId, note })}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
