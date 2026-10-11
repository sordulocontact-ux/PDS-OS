"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { DialogButton } from "@/components/ui/dialog-button";
import type { DependencyOptions } from "@/lib/activations/dependency-options";
import { unlinkDependency } from "@/lib/activations/pilot-actions";
import { fr } from "@/lib/i18n/fr";

import { DependencyForm } from "./dependency-form";

const t = fr.activations.dependencies;

export function LinkDependencyButton(props: {
  projectId: string;
  activationId: string;
  options: DependencyOptions;
}) {
  return (
    <DialogButton
      label={t.add}
      icon={IconPlus}
      title={t.addTitle}
      description={t.addDescription}
    >
      {(close) => <DependencyForm {...props} onDone={close} />}
    </DialogButton>
  );
}

export function UnlinkDependencyButton({
  projectId,
  dependencyId,
  label,
}: {
  projectId: string;
  dependencyId: string;
  label: string;
}) {
  return (
    <ConfirmButton
      label={t.unlink}
      size="xs"
      variant="ghost"
      title={t.unlink}
      body={label}
      confirmLabel={t.unlink}
      pendingLabel={fr.activations.saving}
      done={t.unlinked}
      run={() => unlinkDependency({ projectId, dependencyId })}
    />
  );
}
