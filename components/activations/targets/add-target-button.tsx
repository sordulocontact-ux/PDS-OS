"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { DialogButton } from "@/components/ui/dialog-button";
import { fr } from "@/lib/i18n/fr";

import { AddTargetForm } from "./add-target-form";

const t = fr.activationWork.targets;

export function AddTargetButton({
  projectId,
  activationId,
  press,
}: {
  projectId: string;
  activationId: string;
  press: boolean;
}) {
  return (
    <DialogButton
      label={press ? t.addMedia : t.addInfluencer}
      icon={IconPlus}
      variant="default"
      title={t.addTitle}
      description={t.addDescription}
      wide
    >
      {(close) => (
        <AddTargetForm
          projectId={projectId}
          activationId={activationId}
          press={press}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
