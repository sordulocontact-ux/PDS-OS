"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { formatInstantDay } from "@/lib/utils/instant";
import { attachDesignCall } from "@/lib/design/actions/call";
import { fr } from "@/lib/i18n/fr";

type Errors = Partial<Record<"callId" | "purpose", string>>;

/**
 * « Rattacher un call existant » (MKT-C2-05): a call of the project becomes
 * a creative exchange of the Conception — for the whole release, or for the
 * deliverables chosen.
 */
export function AttachCallButton({
  projectId,
  calls,
  deliverables,
}: {
  projectId: string;
  calls: Array<{ id: string; title: string; occurredAt: string }>;
  deliverables: Array<{ id: string; title: string }>;
}) {
  const t = fr.conceptionCall.exchanges;
  return (
    <DialogButton
      label={t.attach}
      title={t.attachTitle}
      description={t.attachBody}
    >
      {(close) => (
        <AttachCallForm
          projectId={projectId}
          calls={calls}
          deliverables={deliverables}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function AttachCallForm({
  projectId,
  calls,
  deliverables,
  onDone,
}: {
  projectId: string;
  calls: Array<{ id: string; title: string; occurredAt: string }>;
  deliverables: Array<{ id: string; title: string }>;
  onDone: () => void;
}) {
  const t = fr.conceptionCall.exchanges;
  const [errors, setErrors] = useState<Errors>({});
  const { pending, error, run } = useWriteSubmit(onDone, t.attached);
  if (calls.length === 0)
    return (
      <p className="text-body-md text-muted-foreground">{t.noAttachable}</p>
    );
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const callId = String(form.get("callId") ?? "");
        const purpose = String(form.get("purpose") ?? "").trim();
        const found: Errors = {};
        if (!callId) found.callId = t.callRequired;
        if (!purpose) found.purpose = t.purposeRequired;
        setErrors(found);
        if (Object.keys(found).length) return;
        let deliverableIds: string[] = [];
        try {
          deliverableIds = JSON.parse(String(form.get("deliverables") || "[]"));
        } catch {
          deliverableIds = [];
        }
        run(() =>
          attachDesignCall({ projectId, callId, purpose, deliverableIds }),
        );
      }}
    >
      <OptionSelect
        id="attach-call"
        name="callId"
        label={t.attachCall}
        required
        items={Object.fromEntries(
          calls.map((c) => [
            c.id,
            `${c.title} · ${formatInstantDay(c.occurredAt)}`,
          ]),
        )}
        error={errors.callId}
      />
      <Field
        id="attach-purpose"
        name="purpose"
        label={t.attachPurpose}
        required
        maxLength={500}
        defaultValue={t.attachPurposeDefault}
        error={errors.purpose}
      />
      {deliverables.length > 0 && (
        <OptionSelect
          id="attach-deliverables"
          name="deliverables"
          label={t.attachScope}
          hint={t.attachScopeHint}
          multiple
          items={Object.fromEntries(deliverables.map((d) => [d.id, d.title]))}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.attachSubmit}
        onCancel={onDone}
      />
    </form>
  );
}
