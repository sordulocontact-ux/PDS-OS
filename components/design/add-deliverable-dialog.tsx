"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { FormDialog } from "@/components/ui/form-dialog";
import { idleFormState } from "@/lib/auth/form-state";
import { formatDateTime } from "@/lib/calls/format";
import { addConceptionDeliverable } from "@/lib/design/actions/deliverables";
import { ADDITION_ORIGINS, type AdditionOrigin } from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";

type Options = {
  levers: Array<{ id: string; label: string }>;
  calls: Array<{ id: string; title: string; occurredAt: string }>;
};

/**
 * « Ajouter un livrable » of the Conception's entry: a need arrived late,
 * with its provenance (manual, a retained lever of the Stratégie, a call). It
 * is added « à qualifier », neither validated nor planned.
 */
export function AddDeliverableDialog({
  projectId,
  ...options
}: { projectId: string } & Options) {
  const t = fr.conception.add;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="lg" onClick={() => setOpen(true)}>
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.open}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title}
        description={t.description}
        closeLabel={t.close}
      >
        <AddDeliverableForm
          projectId={projectId}
          {...options}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}

function AddDeliverableForm({
  projectId,
  levers,
  calls,
  onDone,
}: { projectId: string; onDone: () => void } & Options) {
  const t = fr.conception.add;
  const [state, action] = useActionState(
    addConceptionDeliverable,
    idleFormState,
  );
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const [origin, setOrigin] = useState<AdditionOrigin>(
    (ADDITION_ORIGINS as readonly string[]).includes(values.origin ?? "")
      ? (values.origin as AdditionOrigin)
      : "manual",
  );

  useEffect(() => {
    if (state.status !== "success") return;
    toast.success(state.message ?? t.added);
    onDone();
    // onDone changes identity on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="projectId" value={projectId} />
      <Field
        name="title"
        label={t.titleLabel}
        required
        autoComplete="off"
        maxLength={200}
        placeholder={t.titlePlaceholder}
        defaultValue={values.title ?? ""}
      />
      <ChoiceCards
        name="origin"
        legend={t.originLegend}
        required
        value={origin}
        onChange={setOrigin}
        choices={ADDITION_ORIGINS.map((value) => ({
          value,
          label: fr.conception.origins[value],
          hint: t.originHints[value],
        }))}
      />
      {origin === "strategy_decision" &&
        (levers.length ? (
          <OptionSelect
            name="leverId"
            label={t.leverLabel}
            placeholder={t.leverPlaceholder}
            required
            items={Object.fromEntries(levers.map((l) => [l.id, l.label]))}
            defaultValue={values.leverId ?? null}
            error={errors.leverId}
          />
        ) : (
          <FormMessage kind="info">{t.noLever}</FormMessage>
        ))}
      {origin === "call" &&
        (calls.length ? (
          <OptionSelect
            name="callId"
            label={t.callLabel}
            placeholder={t.callPlaceholder}
            required
            items={Object.fromEntries(
              calls.map((c) => [
                c.id,
                `${c.title} · ${formatDateTime(c.occurredAt)}`,
              ]),
            )}
            defaultValue={values.callId ?? null}
            error={errors.callId}
          />
        ) : (
          <FormMessage kind="info">{t.noCall}</FormMessage>
        ))}
      <TextareaField
        name="note"
        label={t.noteLabel}
        rows={3}
        maxLength={1000}
        placeholder={t.notePlaceholder}
        defaultValue={values.note ?? ""}
      />
      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {t.cancel}
        </Button>
        <SubmitButton pendingLabel={t.submitting}>{t.submit}</SubmitButton>
      </div>
    </form>
  );
}
