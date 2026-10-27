"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { DialogButton } from "@/components/ui/dialog-button";
import type { MessageKind } from "@/lib/activations/model";
import { activationWork } from "@/lib/i18n/fr/activation-work";

import { MessageForm, type MessageDefaults } from "./message-form";

const fr = { activationWork };

const t = fr.activationWork.messages;

export function NewMessageButton({
  projectId,
  activationId,
  targetId,
  kinds,
  defaults,
  pressKitId,
  label = t.add,
}: {
  projectId: string;
  activationId: string;
  targetId: string | null;
  kinds: readonly MessageKind[];
  defaults: MessageDefaults;
  pressKitId: string | null;
  label?: string;
}) {
  return (
    <DialogButton
      label={label}
      icon={IconPlus}
      title={t.addTitle}
      description={t.addDescription}
      wide
    >
      {(close) => (
        <MessageForm
          projectId={projectId}
          activationId={activationId}
          targetId={targetId}
          kinds={kinds}
          message={null}
          defaults={defaults}
          pressKitId={pressKitId}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
