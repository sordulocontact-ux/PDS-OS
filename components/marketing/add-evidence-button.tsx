"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { EvidenceForm } from "@/components/marketing/evidence-form";
import { DialogButton } from "@/components/ui/dialog-button";
import { fr } from "@/lib/i18n/fr";
import type { EvidenceKind } from "@/lib/marketing/model";

const t = fr.marketing.evidence;

/** « Déclarer une publication », « Déclarer une retombée », « Relever une
 * statistique ». */
export function AddEvidenceButton({
  projectId,
  activationId,
  kind,
}: {
  projectId: string;
  activationId: string;
  kind: EvidenceKind;
}) {
  return (
    <DialogButton
      label={t.add[kind]}
      icon={IconPlus}
      title={t.add[kind]}
      description={t.addBody}
    >
      {(close) => (
        <EvidenceForm
          projectId={projectId}
          activationId={activationId}
          kind={kind}
          evidence={null}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
