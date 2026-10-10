"use client";

import { PrepareCallSheet } from "@/components/calls/prepare-call-sheet";
import { ConceptionCallForm } from "@/components/design/conception-call-form";
import type { DesignCallSheetData } from "@/lib/design/call-prep";
import { fr } from "@/lib/i18n/fr";

/**
 * « Préparer un échange créatif » as a side panel (Chemin A): what PO
 * prepared from what the deliverables lack, adjusted, then checked on a
 * summary before the call is created.
 */
export function ConceptionCallSheet({
  projectId,
  data,
  variant = "outline",
}: {
  projectId: string;
  data: DesignCallSheetData;
  variant?: "default" | "outline";
}) {
  const t = fr.conceptionCall;
  return (
    <PrepareCallSheet
      label={t.prepare}
      title={t.title}
      body={t.body}
      variant={variant}
    >
      {(close) => (
        <ConceptionCallForm
          projectId={projectId}
          data={data}
          onCancel={close}
        />
      )}
    </PrepareCallSheet>
  );
}
