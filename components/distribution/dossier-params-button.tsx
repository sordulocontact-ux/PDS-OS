"use client";

import dynamic from "next/dynamic";

import { DialogButton } from "@/components/ui/dialog-button";
import type { DossierParams } from "@/lib/distribution/dossier";
import { fr } from "@/lib/i18n/fr";

// The form is only needed once the modal opens.
const DossierParamsForm = dynamic(() =>
  import("@/components/distribution/dossier-params-form").then(
    (mod) => mod.DossierParamsForm,
  ),
);

const t = fr.distribution.dossier;

/** « Modifier » the distribution's parameters, for the project's owner. */
export function DossierParamsButton({
  projectId,
  params,
  sheets,
}: {
  projectId: string;
  params: DossierParams;
  sheets: Array<{ id: string; label: string }>;
}) {
  return (
    <DialogButton
      label={t.params.edit}
      title={t.form.title}
      description={t.form.description}
    >
      {(close) => (
        <DossierParamsForm
          projectId={projectId}
          params={params}
          sheets={sheets}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
