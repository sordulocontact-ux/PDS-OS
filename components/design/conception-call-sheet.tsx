"use client";

import { CallPrepLauncher } from "@/components/calls/prep/call-prep-launcher";
import { ConceptionCallPrep } from "@/components/design/conception-call-prep";
import type { DesignCallSheetData } from "@/lib/design/call-prep";
import { fr } from "@/lib/i18n/fr";

/**
 * « Préparer un échange créatif » (Chemin A): the common call form, below
 * the button in the entry card, in the side panel from the exchanges'
 * toolbar.
 */
export function ConceptionCallSheet({
  data,
  mode = "inline",
  variant = "outline",
}: {
  data: DesignCallSheetData;
  mode?: "inline" | "sheet";
  variant?: "default" | "outline";
}) {
  const t = fr.conceptionCall;
  return (
    <CallPrepLauncher
      label={t.prepare}
      title={t.title}
      body={t.body}
      mode={mode}
      variant={variant}
    >
      <ConceptionCallPrep data={data} />
    </CallPrepLauncher>
  );
}
