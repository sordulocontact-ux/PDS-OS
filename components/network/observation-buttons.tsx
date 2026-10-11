"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { ReasonForm } from "@/components/ui/reason-form";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import {
  invalidateObservation,
  recordObservation,
} from "@/lib/network/observation-actions";

const t = fr.network.page;
type Kind = keyof typeof t.observationKinds;
type Source = keyof typeof t.observationSources;

function ObservationForm({
  contactId,
  today,
  onDone,
}: {
  contactId: string;
  today: string;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<Kind>("followers");
  const { pending, error, run } = useWriteSubmit(onDone, t.observationSaved);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const raw = String(data.get("value") ?? "")
          .replace(/\s/g, "")
          .replace(",", ".");
        run(() =>
          recordObservation({
            contactId,
            kind,
            platform: String(data.get("platform") ?? ""),
            value:
              raw === "" || !Number.isFinite(Number(raw)) ? null : Number(raw),
            textValue: String(data.get("textValue") ?? ""),
            observedOn: String(data.get("observedOn") || today),
            source: String(data.get("source")) as Source,
            note: String(data.get("note") ?? ""),
          }),
        );
      }}
    >
      <OptionSelect
        name="kind"
        label={t.observationKind}
        required
        items={t.observationKinds}
        defaultValue={kind}
        onValueChange={(v) => setKind(v as Kind)}
      />
      {kind === "category" ? (
        <Field
          name="textValue"
          label={t.observationText}
          required
          maxLength={80}
        />
      ) : (
        <Field
          name="value"
          label={t.observationValue}
          required
          inputMode="decimal"
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="platform" label={t.observationPlatform} maxLength={60} />
        <Field
          name="observedOn"
          type="date"
          label={t.observationDate}
          required
          defaultValue={today}
          max={today}
        />
      </div>
      <OptionSelect
        name="source"
        label={t.observationSource}
        required
        items={t.observationSources}
        defaultValue="internal"
      />
      <Field name="note" label={t.observationNote} maxLength={500} />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.addObservation}
        </Button>
      </div>
    </form>
  );
}

export function AddObservationButton(props: {
  contactId: string;
  today: string;
}) {
  return (
    <DialogButton
      label={t.addObservation}
      icon={IconPlus}
      title={t.observationTitle}
      description={t.observationsHint}
    >
      {(close) => <ObservationForm {...props} onDone={close} />}
    </DialogButton>
  );
}

export function InvalidateObservationButton({
  contactId,
  observationId,
}: {
  contactId: string;
  observationId: string;
}) {
  return (
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
            invalidateObservation({ contactId, observationId, reason })
          }
          onDone={close}
        />
      )}
    </DialogButton>
  );
}
