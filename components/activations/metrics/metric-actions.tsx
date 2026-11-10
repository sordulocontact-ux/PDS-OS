"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { IconBan, IconCircleCheck, IconCircleXmark } from "@/components/icons";
import { DialogButton } from "@/components/ui/dialog-button";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { toast } from "@/components/ui/toast";
import type { MetricSource } from "@/lib/activations/model";
import {
  invalidateMetric,
  setMetricVerification,
} from "@/lib/activations/proof-actions";
import type { ActivationScope } from "@/lib/activations/types";
import { activations } from "@/lib/i18n/fr/activations";
import { dialogs } from "@/lib/i18n/fr/dialogs";

import { ReasonForm } from "@/components/ui/reason-form";
import { MetricForm } from "./metric-form";

const fr = { activations, dialogs };

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

/** One snapshot's own acts, in its row's « ⋯ » (Sacha 10/11/2026: three
 * buttons per row were too much): verify or contest (writer or validator),
 * invalidate with a reason (writer), asked in a dialog. */
export function MetricActions({
  projectId,
  metricId,
  name,
  verification,
  canVerify,
  canInvalidate,
}: {
  projectId: string;
  metricId: string;
  // Names the row for the menu (« Vues · TikTok »).
  name: string;
  verification: "declared" | "verified" | "contested";
  canVerify: boolean;
  canInvalidate: boolean;
}) {
  const [, startTransition] = useTransition();
  const [invalidating, setInvalidating] = useState(false);
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
  const actions: RowAction[] = [
    ...(canVerify && verification !== "verified"
      ? [
          {
            key: "verify",
            label: t.verify,
            icon: IconCircleCheck,
            onSelect: () => mark("verified"),
          },
        ]
      : []),
    ...(canVerify && verification !== "contested"
      ? [
          {
            key: "contest",
            label: t.contest,
            icon: IconCircleXmark,
            onSelect: () => mark("contested"),
          },
        ]
      : []),
    ...(canInvalidate
      ? [
          {
            key: "invalidate",
            label: t.invalidate,
            icon: IconBan,
            onSelect: () => setInvalidating(true),
          },
        ]
      : []),
  ];
  return (
    <>
      <RowActions label={fr.dialogs.menu(name)} actions={actions} reveal />
      <FormDialog
        open={invalidating}
        onOpenChange={setInvalidating}
        title={t.invalidateTitle}
        description={t.invalidateDescription}
        closeLabel={fr.dialogs.close}
      >
        <ReasonForm
          label={t.invalidateReason}
          submitLabel={t.invalidate}
          doneMessage={t.invalidated}
          run={(reason) => invalidateMetric({ projectId, metricId, reason })}
          onDone={() => setInvalidating(false)}
        />
      </FormDialog>
    </>
  );
}
