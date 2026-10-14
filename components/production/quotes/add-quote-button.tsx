"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { addQuote } from "@/lib/production/quotes/actions";

const t = fr.productionQuotes;

/** « Ajouter un devis »: a rental company's quote, or the production
 * company's received by e-mail. It starts « À vérifier ». */
export function AddQuoteButton({
  projectId,
  sheetId,
}: {
  projectId: string;
  sheetId: string;
}) {
  return (
    <DialogButton
      label={t.add}
      icon={IconPlus}
      title={t.addTitle}
      description={t.addDescription}
    >
      {(close) => (
        <AddQuoteForm projectId={projectId} sheetId={sheetId} onDone={close} />
      )}
    </DialogButton>
  );
}

function AddQuoteForm({
  projectId,
  sheetId,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  onDone: () => void;
}) {
  const [errors, setErrors] = useState<{
    label?: string;
    amount?: string;
    url?: string;
  }>({});
  const { pending, error, run } = useWriteSubmit(onDone, t.added);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (k: string) => String(data.get(k) ?? "").trim();
    const next = {
      label: value("label") ? undefined : t.errors.label,
      amount: value("amount") ? undefined : t.errors.amount,
      url:
        !value("url") || /^https:\/\/\S+$/.test(value("url"))
          ? undefined
          : t.errors.url,
    };
    setErrors(next);
    const first = (["label", "amount", "url"] as const).find((k) => next[k]);
    if (first) {
      form.querySelector<HTMLInputElement>(`[name=${first}]`)?.focus();
      return;
    }
    run(() =>
      addQuote({
        projectId,
        sheetId,
        label: value("label"),
        amount: value("amount"),
        deliveryOn: value("deliveryOn"),
        url: value("url"),
        note: value("note"),
      }),
    );
  }
  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <Field
        name="label"
        label={t.fields.label}
        hint={t.fields.labelHint}
        required
        maxLength={200}
        error={errors.label}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="amount"
          label={t.fields.amount}
          required
          inputMode="decimal"
          suffix="€"
          error={errors.amount}
        />
        <Field name="deliveryOn" label={t.fields.delivery} type="date" />
      </div>
      <Field
        name="url"
        label={t.fields.url}
        hint={t.fields.urlHint}
        type="url"
        inputMode="url"
        placeholder="https://"
        error={errors.url}
      />
      <TextareaField
        name="note"
        label={t.fields.note}
        rows={2}
        maxLength={1000}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.add}
        onCancel={onDone}
      />
    </form>
  );
}
