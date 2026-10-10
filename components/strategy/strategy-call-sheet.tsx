"use client";

import { PrepareCallSheet } from "@/components/calls/prepare-call-sheet";
import { fr } from "@/lib/i18n/fr";
import type { StrategyCallSheetData } from "@/lib/strategy/call-prep";

import { StrategyCallForm } from "./strategy-call-form";

/**
 * « Préparer un échange » of the Stratégie as a side panel: what PO prepared
 * from what the strategy lacks, adjusted, then checked on a summary before
 * the call is created.
 */
export function StrategyCallSheet({
  projectId,
  data,
  variant = "outline",
}: {
  projectId: string;
  data: StrategyCallSheetData;
  variant?: "default" | "outline";
}) {
  const t = fr.strategyEntry.call;
  return (
    <PrepareCallSheet
      label={fr.strategyEntry.prepare}
      title={t.title}
      body={t.body}
      variant={variant}
    >
      {(close) => (
        <StrategyCallForm projectId={projectId} data={data} onCancel={close} />
      )}
    </PrepareCallSheet>
  );
}
