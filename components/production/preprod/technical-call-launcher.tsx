"use client";

import { PrepareCallSheet } from "@/components/calls/prepare-call-sheet";
import { fr } from "@/lib/i18n/fr";

import {
  TechnicalCallForm,
  type TechnicalCallSheetData,
} from "./technical-call-form";

/** « Préparer le call technique » as a side panel. */
export function TechnicalCallLauncher({
  projectId,
  data,
}: {
  projectId: string;
  data: TechnicalCallSheetData;
}) {
  const t = fr.productionPreprod.call;
  return (
    <PrepareCallSheet label={t.prepare} title={t.sheetTitle} body={t.sheetBody}>
      {(close) => (
        <TechnicalCallForm projectId={projectId} data={data} onCancel={close} />
      )}
    </PrepareCallSheet>
  );
}
