"use client";

import { IconPlus } from "nucleo-sharp-essential";

import {
  ActivationForm,
  type ActivationFormOptions,
} from "@/components/marketing/activation-form";
import { DialogButton } from "@/components/ui/dialog-button";
import { fr } from "@/lib/i18n/fr";

const t = fr.marketing.activations;

/** « Ajouter une activation », in the modal. */
export function AddActivationButton({
  projectId,
  options,
  variant = "outline",
}: {
  projectId: string;
  options: ActivationFormOptions;
  variant?: "default" | "outline";
}) {
  return (
    <DialogButton
      label={t.add}
      icon={IconPlus}
      variant={variant}
      title={t.addTitle}
      description={t.addBody}
    >
      {(close) => (
        <ActivationForm
          projectId={projectId}
          activation={null}
          options={options}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
