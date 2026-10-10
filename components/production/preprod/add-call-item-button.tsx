"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { fr } from "@/lib/i18n/fr";

import { CallItemForm } from "./call-item-form";
import { DialogButton } from "./dialog-button";

const t = fr.productionPreprod.call;

/** « Noter un point »: a person's own point of the call, confirmed at once. */
export function AddCallItemButton({
  projectId,
  sheetId,
  topics,
}: {
  projectId: string;
  sheetId: string;
  topics: string[];
}) {
  return (
    <DialogButton
      label={t.add}
      icon={IconPlus}
      title={t.addTitle}
      description={t.formDescription}
    >
      {(close) => (
        <CallItemForm
          projectId={projectId}
          sheetId={sheetId}
          item={null}
          topics={topics}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
