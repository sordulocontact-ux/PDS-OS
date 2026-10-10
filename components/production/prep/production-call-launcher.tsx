"use client";

import { PrepareCallSheet } from "@/components/calls/prepare-call-sheet";
import { ProductionCallForm } from "@/components/production/prep/production-call-form";
import { fr } from "@/lib/i18n/fr";
import type { ProductionCallSheetData } from "@/lib/production/call-prep";

/**
 * « Préparer un call de production » as a side panel: what PO prepared from
 * what the preparation lacks, adjusted, then checked on a summary before the
 * call is created.
 */
export function ProductionCallLauncher({
  projectId,
  data,
}: {
  projectId: string;
  data: ProductionCallSheetData;
}) {
  const t = fr.productionCall;
  return (
    <PrepareCallSheet label={t.prepare} title={t.title} body={t.body}>
      {(close) => (
        <ProductionCallForm
          projectId={projectId}
          data={data}
          onCancel={close}
        />
      )}
    </PrepareCallSheet>
  );
}
