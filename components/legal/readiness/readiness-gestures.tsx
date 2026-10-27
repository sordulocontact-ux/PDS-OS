"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogButton } from "@/components/ui/dialog-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { FormMessage } from "@/components/auth/form-message";
import { legalReadiness } from "@/lib/i18n/fr/legal-readiness";
import {
  grantReleaseWaiver,
  setReleasePolicy,
  validateRelease,
} from "@/lib/legal/readiness/actions";

const fr = { legalReadiness };

const t = fr.legalReadiness;

/** « Accorder une dérogation » on one open control (the direction). */
export function WaiverButton({
  projectId,
  controlKey,
  label,
}: {
  projectId: string;
  controlKey: string;
  label: string;
}) {
  return (
    <DialogButton
      label={t.waiver.grant}
      variant="ghost"
      title={t.waiver.grant}
      description={`${label} · ${t.waiver.body}`}
    >
      {(close) => (
        <ReasonForm
          label={t.waiver.why}
          submitLabel={t.waiver.grant}
          doneMessage={t.waiver.done}
          run={(reason) =>
            grantReleaseWaiver({ projectId, controlKey, reason })
          }
          onDone={() => {
            close();
          }}
        />
      )}
    </DialogButton>
  );
}

/** « SACEM bloquante »: the label's policy, set by the direction. */
export function SacemPolicyToggle({
  projectId,
  sacemBlocks,
}: {
  projectId: string;
  sacemBlocks: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex w-fit items-center gap-2.5 text-[length:var(--type-body-sm)] font-medium">
      <Checkbox
        checked={sacemBlocks}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.checked;
          startTransition(async () => {
            const result = await setReleasePolicy(projectId, next);
            if (!result.ok) return void toast.error(result.error);
            toast.success(t.policy.saved);
          });
        }}
      />
      {t.policy.sacem}
    </label>
  );
}

/** « Valider la sortie avant The Orchard » (the direction, last). */
export function ValidateReleaseButton({ projectId }: { projectId: string }) {
  const [done, setDone] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => {
    setDone(true);
  }, t.validate.done);
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        className="self-start"
        disabled={pending || done}
        aria-busy={pending || undefined}
        onClick={() => run(() => validateRelease(projectId))}
      >
        {t.validate.action}
      </Button>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
