"use client";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { depositQuoteByLink } from "@/lib/production/provider/journey-actions";

import { useLinkSubmit } from "./use-link-submit";

const t = fr.productionLink.quote;

/** The company deposits its quote from its link. */
export function LinkQuoteForm({
  token,
  redo,
}: {
  token: string;
  redo: boolean;
}) {
  const { pending, error, run } = useLinkSubmit();
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const v = (k: string) => String(data.get(k) ?? "").trim();
        run(
          () =>
            depositQuoteByLink({
              token,
              label: v("label") || t.labelDefault,
              amount: v("amount"),
              deliveryOn: v("deliveryOn"),
              url: v("url"),
              note: v("note"),
            }),
          t.done,
          () => form.reset(),
        );
      }}
    >
      <Field
        name="label"
        label={t.label}
        defaultValue={t.labelDefault}
        maxLength={200}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="amount"
          label={t.amount}
          required
          inputMode="decimal"
          suffix="€"
        />
        <Field name="deliveryOn" label={t.delivery} type="date" />
      </div>
      <Field
        name="url"
        label={t.url}
        type="url"
        inputMode="url"
        placeholder="https://"
      />
      <TextareaField name="note" label={t.note} rows={2} maxLength={1000} />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {redo ? t.redo : t.submit}
        </Button>
      </div>
    </form>
  );
}
