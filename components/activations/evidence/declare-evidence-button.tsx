"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { DialogButton } from "@/components/ui/dialog-button";
import type { EvidenceKind, EvidenceSource } from "@/lib/activations/model";
import type { ActivationScope } from "@/lib/activations/types";
import { activations } from "@/lib/i18n/fr/activations";

import { EvidenceForm } from "./evidence-form";

const fr = { activations };

const t = fr.activations.evidence;

export function DeclareEvidenceButton({
  scope,
  targetId,
  agencyRowId,
  defaultKind,
  defaultSource,
  label = t.declare,
}: {
  scope: ActivationScope;
  targetId?: string | null;
  agencyRowId?: string | null;
  defaultKind: EvidenceKind;
  defaultSource?: EvidenceSource;
  label?: string;
}) {
  return (
    <DialogButton
      label={label}
      icon={IconPlus}
      title={t.declareTitle}
      description={t.declareDescription}
    >
      {(close) => (
        <EvidenceForm
          scope={scope}
          targetId={targetId}
          agencyRowId={agencyRowId}
          defaultKind={defaultKind}
          defaultSource={defaultSource}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
