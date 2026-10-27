"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { DialogButton } from "@/components/ui/dialog-button";
import { productionLocations } from "@/lib/i18n/fr/production-locations";

import { LocationOptionForm } from "./location-option-form";

const fr = { productionLocations };

const t = fr.productionLocations;

/** « Ajouter un lieu » to compare: a client leaf, the dialog's body a
 * function (never passed from a server component). */
export function AddLocationButton({
  projectId,
  sheetId,
}: {
  projectId: string;
  sheetId: string;
}) {
  return (
    <DialogButton
      label={t.add}
      icon={IconPlus}
      title={t.addTitle}
      description={t.formDescription}
    >
      {(close) => (
        <LocationOptionForm
          projectId={projectId}
          sheetId={sheetId}
          option={null}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
