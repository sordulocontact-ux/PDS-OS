"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import type { MetricSource } from "@/lib/activations/model";
import {
  invalidateMetric,
  setMetricVerification,
} from "@/lib/activations/proof-actions";
import type { ActivationScope } from "@/lib/activations/types";
import { activations } from "@/lib/i18n/fr/activations";

import { ReasonForm } from "@/components/ui/reason-form";
import { MetricForm } from "./metric-form";

const fr = { activations };

const t = fr.activations.metrics;

export function RecordMetricButton(props: {
  scope: ActivationScope;
  targetId?: string | null;
  agencyRowId?: string | null;
  defaultSource?: MetricSource;
  today: string;
  // Ghost beside « Relever les statistiques » (outline), else outline.
  variant?: "outline" | "ghost";
}) {
  const { variant, ...form } = props;
  return (
    <DialogButton
      variant={variant}
      label={t.record}
      icon={IconPlus}
      title={t.recordTitle}
      description={t.recordDescription}
    >
      {(close) => <MetricForm {...form} onDone={close} />}
    </DialogButton>
  );
}

/** One snapshot's own acts : verify or contest (writer or validator),
 * invalidate with a reason (writer). */
export function MetricActions({
  projectId,
  metricId,
  verification,
  canVerify,
  canInvalidate,
}: {
  projectId: string;
  metricId: string;
  verification: "declared" | "verified" | "contested";
  canVerify: boolean;
  canInvalidate: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const mark = (next: "verified" | "contested") =>
    startTransition(async () => {
      const result = await setMetricVerification({
        projectId,
        metricId,
        verification: next,
      });
      if (result.ok) toast.success(t.verified);
      else toast.error(result.error);
    });
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {canVerify && verification !== "verified" && (
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={pending}
          onClick={() => mark("verified")}
        >
          {t.verify}
        </Button>
      )}
      {canVerify && verification !== "contested" && (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={pending}
          onClick={() => mark("contested")}
        >
          {t.contest}
        </Button>
      )}
      {canInvalidate && (
        <DialogButton
          label={t.invalidate}
          size="xs"
          variant="ghost"
          title={t.invalidateTitle}
          description={t.invalidateDescription}
        >
          {(close) => (
            <ReasonForm
              label={t.invalidateReason}
              submitLabel={t.invalidate}
              doneMessage={t.invalidated}
              run={(reason) =>
                invalidateMetric({ projectId, metricId, reason })
              }
              onDone={close}
            />
          )}
        </DialogButton>
      )}
    </div>
  );
}
