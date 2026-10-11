"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { DialogButton } from "@/components/ui/dialog-button";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";

import { ActivationForm, type ActivationFormSource } from "./activation-form";

const t = fr.activations.create;

/** « Nouvelle activation », or « Créer l'activation » from a source of the
 * Stratégie or the Production (`source`) ; the owner proposed is the
 * project's (`defaultOwnerId`). */
export function NewActivationButton({
  projectId,
  members,
  source,
  defaultOwnerId,
}: {
  projectId: string;
  members: Member[];
  source?: ActivationFormSource;
  defaultOwnerId: string | null;
}) {
  return (
    <DialogButton
      label={source ? t.fromSource : t.button}
      icon={source ? undefined : IconPlus}
      variant={source ? "outline" : "default"}
      size={source ? "xs" : "lg"}
      title={t.title}
      description={t.description}
    >
      {(close) => (
        <ActivationForm
          projectId={projectId}
          members={members}
          source={source}
          defaultOwnerId={defaultOwnerId}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
